'use server'

import { createClient } from '@/lib/supabase-server'
import { callGemini, SchemaType } from '@/lib/ai/gemini-client'
import { readCache, writeCache } from '@/lib/ai/cache-utils'
import { logger } from '@/lib/logger'
import type {
  BuyingPattern,
  CustomerRiskProfile,
  CustomerIntelligenceData as InternalCustomerIntelligenceData,
} from '@/types/ai-customer-intelligence'
import type {
  CustomerIntelligenceData as FrontendCustomerIntelligenceData,
  CustomerChurnRisk,
} from '@/types/ai-expansion'

// Import pure utility functions for internal use
// NOTE: These cannot be re-exported from a 'use server' file
// Tests and other modules must import directly from @/lib/ai/customer-scoring
import { calculateChurnScore, type ChurnRisk } from '@/lib/ai/customer-scoring'

const CACHE_KEY = 'customer_intelligence'
const CACHE_TTL_HOURS = 12
const MODEL = 'gemini-2.5-flash'

// ============================================
// DATA AGGREGATION
// ============================================

interface CustomerAggregation {
  customerName: string
  orderCount: number
  totalRevenue: number
  lastOrderDate: string
  firstOrderDate: string
  materials: string[]
}

async function aggregateCustomerData(companyId: string): Promise<CustomerAggregation[]> {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('customer_name, selling_price, material, created_at')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('[customer-intelligence] Error fetching orders', { error })
    return []
  }

  const map = new Map<string, CustomerAggregation>()

  for (const order of orders || []) {
    const name = order.customer_name
    const existing = map.get(name)

    if (existing) {
      existing.orderCount++
      existing.totalRevenue += Number(order.selling_price) || 0
      if (order.material && !existing.materials.includes(order.material)) {
        existing.materials.push(order.material)
      }
      // firstOrderDate — since sorted desc, the last one processed is the oldest
      existing.firstOrderDate = order.created_at
    } else {
      map.set(name, {
        customerName: name,
        orderCount: 1,
        totalRevenue: Number(order.selling_price) || 0,
        lastOrderDate: order.created_at,
        firstOrderDate: order.created_at,
        materials: order.material ? [order.material] : [],
      })
    }
  }

  return [...map.values()]
}

// ============================================
// CHURN RISK CALCULATION
// ============================================

function calculateChurnRisk(daysSinceLastOrder: number): ChurnRisk {
  if (daysSinceLastOrder > 60) return 'high'
  if (daysSinceLastOrder > 30) return 'medium'
  return 'low'
}

function computeDaysSince(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.ceil((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

// ============================================
// HEURISTIC FALLBACK
// ============================================

function generateHeuristicIntelligence(
  customers: CustomerAggregation[]
): InternalCustomerIntelligenceData {
  const profiles: CustomerRiskProfile[] = customers.map(c => {
    const daysSince = computeDaysSince(c.lastOrderDate)
    const daysActive = computeDaysSince(c.firstOrderDate)
    const frequencyDays = c.orderCount > 1 ? Math.round(daysActive / (c.orderCount - 1)) : 0

    const churnRisk = calculateChurnRisk(daysSince)

    let recommendation = ''
    if (churnRisk === 'high') {
      recommendation = `Klient nieaktywny od ${daysSince} dni. Rozważ kontakt telefoniczny z oferta specjalna.`
    } else if (churnRisk === 'medium') {
      recommendation = `Klient zamawial srednio co ${frequencyDays || '?'} dni. Wyslij przypomnienie o wspolpracy.`
    } else {
      recommendation = `Aktywny klient. Utrzymuj relacje i rozważ oferte upsellowa.`
    }

    return {
      customerName: c.customerName,
      churnRisk,
      daysSinceLastOrder: daysSince,
      buyingPattern: {
        avgOrderValue: c.orderCount > 0 ? Math.round(c.totalRevenue / c.orderCount) : 0,
        orderFrequencyDays: frequencyDays,
        preferredMaterials: c.materials.slice(0, 3),
        totalOrders: c.orderCount,
        totalRevenue: Math.round(c.totalRevenue),
      },
      aiRecommendation: recommendation,
    }
  })

  // Sort by churn risk (high first)
  profiles.sort((a, b) => {
    const riskOrder: Record<ChurnRisk, number> = { high: 0, medium: 1, low: 2 }
    return riskOrder[a.churnRisk] - riskOrder[b.churnRisk]
  })

  const highRisk = profiles.filter(p => p.churnRisk === 'high').length
  const medRisk = profiles.filter(p => p.churnRisk === 'medium').length

  let overallAnalysis = `Masz ${profiles.length} klientow.`
  if (highRisk > 0) {
    overallAnalysis += ` ${highRisk} z wysokim ryzykiem odejscia (>60 dni bez zamowienia).`
  }
  if (medRisk > 0) {
    overallAnalysis += ` ${medRisk} ze srednim ryzykiem (30-60 dni).`
  }

  return {
    customers: profiles,
    overallAnalysis,
    generatedAt: new Date().toISOString(),
    model: 'heuristic',
    isStale: false,
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Get customer intelligence — cache-first (12h TTL), then Gemini, then heuristic.
 */
function toFrontendFormat(
  heuristic: InternalCustomerIntelligenceData
): FrontendCustomerIntelligenceData {
  const churnRisks: CustomerChurnRisk[] = heuristic.customers.map(c => ({
    customerId: c.customerName,
    customerName: c.customerName,
    riskLevel: c.churnRisk,
    lastOrderDate: null,
    orderCount: c.buyingPattern.totalOrders,
    totalRevenue: c.buyingPattern.totalRevenue,
    daysSinceLastOrder: c.daysSinceLastOrder,
    riskFactors: [c.aiRecommendation],
  }))

  const inactiveCount = churnRisks.filter(c => c.riskLevel === 'high').length
  const atRiskRevenue = churnRisks
    .filter(c => c.riskLevel === 'high' || c.riskLevel === 'medium')
    .reduce((s, c) => s + c.totalRevenue, 0)

  return {
    churnRisks,
    inactiveCount,
    atRiskRevenue,
    aiAnalysis: heuristic.overallAnalysis,
    generatedAt: heuristic.generatedAt,
  }
}

export async function getCustomerIntelligence(
  companyId: string
): Promise<FrontendCustomerIntelligenceData> {
  // 1. Try cache
  const cached = await readCache<{ customers: CustomerRiskProfile[]; overallAnalysis: string }>(
    companyId,
    CACHE_KEY
  )
  if (cached && !cached.isStale) {
    const internal: InternalCustomerIntelligenceData = {
      customers: cached.data.customers,
      overallAnalysis: cached.data.overallAnalysis,
      generatedAt: cached.generatedAt,
      model: cached.model,
      isStale: false,
    }
    return toFrontendFormat(internal)
  }

  // 2. Aggregate data
  const customerData = await aggregateCustomerData(companyId)
  if (customerData.length === 0) {
    return {
      churnRisks: [],
      inactiveCount: 0,
      atRiskRevenue: 0,
      aiAnalysis: 'Brak danych o klientach. Dodaj zlecenia aby zobaczyc analize.',
      generatedAt: new Date().toISOString(),
    }
  }

  // 3. Build heuristic profiles first (always needed for structure)
  const heuristic = generateHeuristicIntelligence(customerData)

  // 4. Try Gemini for AI recommendations
  const aiResult = await callGemini<{
    recommendations: Array<{ customerName: string; recommendation: string }>
    overallAnalysis: string
  }>({
    label: 'customer-intelligence',
    prompt: buildPrompt(heuristic.customers),
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        recommendations: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              customerName: { type: SchemaType.STRING },
              recommendation: { type: SchemaType.STRING, description: 'Konkretna rekomendacja po polsku' },
            },
            required: ['customerName', 'recommendation'],
          },
        },
        overallAnalysis: { type: SchemaType.STRING, description: 'Ogolna analiza sytuacji klientow po polsku, 2-3 zdania' },
      },
      required: ['recommendations', 'overallAnalysis'],
    },
    temperature: 0.3,
  })

  if (aiResult) {
    // Merge AI recommendations into heuristic profiles
    for (const rec of aiResult.data.recommendations) {
      const profile = heuristic.customers.find(
        (c: CustomerRiskProfile) => c.customerName.toLowerCase() === rec.customerName.toLowerCase()
      )
      if (profile) {
        profile.aiRecommendation = rec.recommendation
      }
    }
    heuristic.overallAnalysis = aiResult.data.overallAnalysis
    heuristic.model = aiResult.model
  }

  // 5. Cache the result
  await writeCache(
    companyId,
    CACHE_KEY,
    { customers: heuristic.customers, overallAnalysis: heuristic.overallAnalysis },
    CACHE_TTL_HOURS,
    heuristic.model
  )

  return toFrontendFormat(heuristic)
}

/**
 * Force refresh customer intelligence.
 */
export async function refreshCustomerIntelligence(
  companyId: string
): Promise<FrontendCustomerIntelligenceData> {
  // Same as getCustomerIntelligence but always regenerates
  const customerData = await aggregateCustomerData(companyId)
  if (customerData.length === 0) {
    return {
      churnRisks: [],
      inactiveCount: 0,
      atRiskRevenue: 0,
      aiAnalysis: 'Brak danych o klientach.',
      generatedAt: new Date().toISOString(),
    }
  }

  const heuristic = generateHeuristicIntelligence(customerData)

  const aiResult = await callGemini<{
    recommendations: Array<{ customerName: string; recommendation: string }>
    overallAnalysis: string
  }>({
    label: 'customer-intelligence-refresh',
    prompt: buildPrompt(heuristic.customers),
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        recommendations: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              customerName: { type: SchemaType.STRING },
              recommendation: { type: SchemaType.STRING },
            },
            required: ['customerName', 'recommendation'],
          },
        },
        overallAnalysis: { type: SchemaType.STRING },
      },
      required: ['recommendations', 'overallAnalysis'],
    },
    temperature: 0.3,
  })

  if (aiResult) {
    for (const rec of aiResult.data.recommendations) {
      const profile = heuristic.customers.find(
        (c: CustomerRiskProfile) => c.customerName.toLowerCase() === rec.customerName.toLowerCase()
      )
      if (profile) {
        profile.aiRecommendation = rec.recommendation
      }
    }
    heuristic.overallAnalysis = aiResult.data.overallAnalysis
    heuristic.model = aiResult.model
  }

  await writeCache(
    companyId,
    CACHE_KEY,
    { customers: heuristic.customers, overallAnalysis: heuristic.overallAnalysis },
    CACHE_TTL_HOURS,
    heuristic.model
  )

  return toFrontendFormat(heuristic)
}

// ============================================
// PROMPT BUILDER
// ============================================

// ============================================
// EXPORTED SERVER ACTIONS (async functions with server dependencies)
// ============================================

export interface InactiveCustomer {
  name: string
  daysSinceLastOrder: number
  totalOrders: number
}

/**
 * Get customers inactive for more than `thresholdDays`.
 */
export async function getInactiveCustomers(
  companyId: string,
  thresholdDays: number
): Promise<InactiveCustomer[]> {
  const data = await aggregateCustomerData(companyId)

  const results: InactiveCustomer[] = []
  for (const c of data) {
    const daysSince = computeDaysSince(c.lastOrderDate)
    if (daysSince >= thresholdDays) {
      results.push({
        name: c.customerName,
        daysSinceLastOrder: daysSince,
        totalOrders: c.orderCount,
      })
    }
  }

  // Sort by days since last order (most inactive first)
  results.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder)

  return results
}

export type OrderFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'irregular' | 'none'
export type OrderTrend = 'growing' | 'stable' | 'declining'

export interface BuyingPatternAnalysis {
  topMaterials: string[]
  averageOrderValue: number
  orderFrequency: OrderFrequency
  trend: OrderTrend
  totalOrders: number
}

/**
 * Analyze buying patterns for a specific customer.
 */
export async function analyzeBuyingPatterns(
  companyId: string,
  customerName: string
): Promise<BuyingPatternAnalysis> {
  const emptyResult: BuyingPatternAnalysis = {
    topMaterials: [],
    averageOrderValue: 0,
    orderFrequency: 'none',
    trend: 'stable',
    totalOrders: 0,
  }

  try {
    const supabase = await createClient()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('material, selling_price, created_at, quantity')
      .eq('company_id', companyId)
      .eq('customer_name', customerName)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (error || !orders || orders.length === 0) {
      return emptyResult
    }

    // Top materials
    const matCounts = new Map<string, number>()
    for (const o of orders) {
      if (o.material) {
        matCounts.set(o.material, (matCounts.get(o.material) || 0) + 1)
      }
    }
    const topMaterials = [...matCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mat]) => mat)

    // Average order value
    const prices = orders.map(o => Number(o.selling_price) || 0).filter(p => p > 0)
    const averageOrderValue = prices.length > 0
      ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
      : 0

    // Order frequency
    let orderFrequency: OrderFrequency = 'none'
    if (orders.length >= 2) {
      const dates = orders.map(o => new Date(o.created_at).getTime()).sort()
      const gaps: number[] = []
      for (let i = 1; i < dates.length; i++) {
        gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24))
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length

      if (avgGap <= 2) orderFrequency = 'daily'
      else if (avgGap <= 10) orderFrequency = 'weekly'
      else if (avgGap <= 20) orderFrequency = 'biweekly'
      else if (avgGap <= 45) orderFrequency = 'monthly'
      else if (avgGap <= 120) orderFrequency = 'quarterly'
      else orderFrequency = 'irregular'
    }

    // Trend (compare first half revenue vs second half)
    let trend: OrderTrend = 'stable'
    if (orders.length >= 4) {
      const mid = Math.floor(orders.length / 2)
      // orders are sorted desc, so first half = recent, second half = older
      const recentRevenue = orders.slice(0, mid).reduce((s, o) => s + (Number(o.selling_price) || 0), 0)
      const olderRevenue = orders.slice(mid).reduce((s, o) => s + (Number(o.selling_price) || 0), 0)
      if (olderRevenue > 0) {
        const change = (recentRevenue - olderRevenue) / olderRevenue
        if (change > 0.1) trend = 'growing'
        else if (change < -0.1) trend = 'declining'
      }
    }

    return {
      topMaterials,
      averageOrderValue,
      orderFrequency,
      trend,
      totalOrders: orders.length,
    }
  } catch (err) {
    logger.error('[customer-intelligence] analyzeBuyingPatterns error', { error: err })
    return emptyResult
  }
}

export interface CustomerSegment {
  name: 'vip' | 'regular' | 'occasional' | 'at_risk' | 'new'
  count: number
  customers: string[]
}

export interface SegmentationResult {
  segments: CustomerSegment[]
}

/**
 * Segment all customers into categories.
 */
export async function segmentCustomers(
  companyId: string
): Promise<SegmentationResult> {
  const data = await aggregateCustomerData(companyId)

  const segments: Record<string, CustomerSegment> = {
    vip: { name: 'vip', count: 0, customers: [] },
    regular: { name: 'regular', count: 0, customers: [] },
    occasional: { name: 'occasional', count: 0, customers: [] },
    at_risk: { name: 'at_risk', count: 0, customers: [] },
    new: { name: 'new', count: 0, customers: [] },
  }

  if (data.length === 0) {
    return { segments: Object.values(segments) }
  }

  // Calculate revenue threshold for VIP (top 20% by revenue)
  const revenues = data.map(c => c.totalRevenue).sort((a, b) => b - a)
  const vipThreshold = revenues.length > 0 ? revenues[Math.floor(revenues.length * 0.2)] : Infinity

  for (const customer of data) {
    const daysSince = computeDaysSince(customer.lastOrderDate)

    if (customer.totalRevenue >= vipThreshold && customer.orderCount >= 3) {
      segments.vip.count++
      segments.vip.customers.push(customer.customerName)
    } else if (daysSince > 60) {
      segments.at_risk.count++
      segments.at_risk.customers.push(customer.customerName)
    } else if (customer.orderCount >= 3) {
      segments.regular.count++
      segments.regular.customers.push(customer.customerName)
    } else if (customer.orderCount === 1) {
      segments.new.count++
      segments.new.customers.push(customer.customerName)
    } else {
      segments.occasional.count++
      segments.occasional.customers.push(customer.customerName)
    }
  }

  return { segments: Object.values(segments) }
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildPrompt(profiles: CustomerRiskProfile[]): string {
  const profilesSummary = profiles.slice(0, 20).map(p => ({
    name: p.customerName,
    risk: p.churnRisk,
    daysSince: p.daysSinceLastOrder,
    orders: p.buyingPattern.totalOrders,
    revenue: p.buyingPattern.totalRevenue,
    avgOrder: p.buyingPattern.avgOrderValue,
    materials: p.buyingPattern.preferredMaterials.join(', '),
  }))

  return `Jestes analitykiem CRM dla warsztatu CNC. Przygotuj rekomendacje dotyczace klientow.

DANE KLIENTOW:
${JSON.stringify(profilesSummary, null, 2)}

ZASADY:
- Dla KAZDEGO klienta podaj KONKRETNA rekomendacje po polsku (co zrobic, jak odzyskac, jak rozwinac)
- overallAnalysis: 2-3 zdania ogolnej oceny sytuacji klientow
- Priorytet: klienci z wysokim ryzykiem odejscia (high risk)
- Nie wymyslaj danych — opieraj sie na podanych liczbach
- Rekomendacje powinny byc praktyczne i wykonalne`
}
