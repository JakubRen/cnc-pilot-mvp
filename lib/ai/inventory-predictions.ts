'use server'

import { createClient } from '@/lib/supabase-server'
import { callGemini, SchemaType } from '@/lib/ai/gemini-client'
import { readCache, writeCache } from '@/lib/ai/cache-utils'
import { logger } from '@/lib/logger'
import type {
  StockoutRisk,
  InventoryPrediction,
  InventoryPredictionsData as InternalInventoryPredictionsData,
} from '@/types/ai-inventory-predictions'
import type {
  InventoryPredictionsData as FrontendInventoryPredictionsData,
  InventoryPrediction as FrontendInventoryPrediction,
} from '@/types/ai-expansion'

// Import pure utility functions for internal use
// NOTE: These cannot be re-exported from a 'use server' file
// Tests and other modules must import directly from @/lib/ai/inventory-math
import {
  calculateUsageVelocity,
  predictStockoutDate,
  calculateReorderPoint,
  analyzeUsageTrend,
  type UsageTrendResult,
} from '@/lib/ai/inventory-math'

const CACHE_KEY = 'inventory_predictions'
const CACHE_TTL_HOURS = 8
const MODEL = 'gemini-2.5-flash'

// ============================================
// DATA AGGREGATION
// ============================================

interface InventoryItem {
  name: string
  quantity: number
  low_stock_threshold: number | null
}

interface MaterialUsage {
  material: string
  mentionCount: number
  totalQuantityOrdered: number
}

async function fetchInventory(companyId: string): Promise<InventoryItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .select('name, quantity, low_stock_threshold')
    .eq('company_id', companyId)

  if (error) {
    logger.error('[inventory-predictions] Error fetching inventory', { error })
    return []
  }

  return data || []
}

async function fetchMaterialUsage(companyId: string): Promise<MaterialUsage[]> {
  const supabase = await createClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: orders, error } = await supabase
    .from('orders')
    .select('material, quantity')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .gte('created_at', ninetyDaysAgo.toISOString())
    .not('material', 'is', null)

  if (error) {
    logger.error('[inventory-predictions] Error fetching orders for usage', { error })
    return []
  }

  const usageMap = new Map<string, MaterialUsage>()

  for (const order of orders || []) {
    if (!order.material) continue
    const matLower = order.material.toLowerCase()
    const existing = usageMap.get(matLower)

    if (existing) {
      existing.mentionCount++
      existing.totalQuantityOrdered += order.quantity || 0
    } else {
      usageMap.set(matLower, {
        material: order.material,
        mentionCount: 1,
        totalQuantityOrdered: order.quantity || 0,
      })
    }
  }

  return [...usageMap.values()]
}

// ============================================
// STOCKOUT CALCULATION
// ============================================

function calculateStockoutDays(
  currentQuantity: number,
  velocityPerWeek: number
): number | null {
  if (velocityPerWeek <= 0) return null // no usage = no stockout prediction
  const dailyVelocity = velocityPerWeek / 7
  if (dailyVelocity <= 0) return null
  return Math.round(currentQuantity / dailyVelocity)
}

function calculateRisk(daysUntilStockout: number | null): StockoutRisk {
  if (daysUntilStockout === null) return 'ok'
  if (daysUntilStockout < 7) return 'critical'
  if (daysUntilStockout < 21) return 'warning'
  return 'ok'
}

// ============================================
// HEURISTIC FALLBACK
// ============================================

function generateHeuristicPredictions(
  inventory: InventoryItem[],
  materialUsage: MaterialUsage[]
): InternalInventoryPredictionsData {
  // Calculate weeks in the 90-day window
  const weeksInWindow = 90 / 7

  const predictions: InventoryPrediction[] = inventory.map(item => {
    const nameLower = item.name.toLowerCase()
    const usage = materialUsage.find(u => u.material.toLowerCase() === nameLower)

    const velocityPerWeek = usage
      ? usage.mentionCount / weeksInWindow
      : 0

    const daysUntilStockout = calculateStockoutDays(item.quantity, velocityPerWeek)
    const risk = calculateRisk(daysUntilStockout)

    let recommendation = ''
    if (risk === 'critical') {
      recommendation = `Krytycznie niski stan! Zamow ${item.name} natychmiast — zapas na mniej niz 7 dni.`
    } else if (risk === 'warning') {
      recommendation = `Zaplanuj zamowienie ${item.name} w ciagu tygodnia — zapas na ok. ${daysUntilStockout} dni.`
    } else if (daysUntilStockout !== null) {
      recommendation = `Stan wystarczajacy na ok. ${daysUntilStockout} dni. Monitoruj zuzycie.`
    } else {
      recommendation = 'Brak danych o zuzyciu — brak zamowien z tym materialem w ostatnich 90 dniach.'
    }

    return {
      materialName: item.name,
      currentQuantity: item.quantity,
      usageVelocityPerWeek: Math.round(velocityPerWeek * 100) / 100,
      daysUntilStockout,
      risk,
      recommendation,
    }
  })

  // Sort by risk: critical first, then warning, then ok
  const riskOrder: Record<StockoutRisk, number> = { critical: 0, warning: 1, ok: 2 }
  predictions.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])

  const criticalCount = predictions.filter(p => p.risk === 'critical').length
  const warningCount = predictions.filter(p => p.risk === 'warning').length

  let overallAnalysis = `${predictions.length} pozycji w magazynie.`
  if (criticalCount > 0) {
    overallAnalysis += ` ${criticalCount} z krytycznie niskim stanem wymaga natychmiastowego zamowienia.`
  }
  if (warningCount > 0) {
    overallAnalysis += ` ${warningCount} pozycji do zamowienia w ciagu tygodnia.`
  }
  if (criticalCount === 0 && warningCount === 0) {
    overallAnalysis += ' Wszystkie pozycje maja wystarczajacy zapas.'
  }

  return {
    predictions,
    overallAnalysis,
    generatedAt: new Date().toISOString(),
    model: 'heuristic',
    isStale: false,
  }
}

// ============================================
// PUBLIC API
// ============================================

function toFrontendFormat(
  internal: InternalInventoryPredictionsData
): FrontendInventoryPredictionsData {
  const predictions: FrontendInventoryPrediction[] = internal.predictions.map(p => ({
    itemId: p.materialName,
    itemName: p.materialName,
    sku: '',
    currentStock: p.currentQuantity,
    usageVelocity: p.usageVelocityPerWeek / 7, // convert to daily
    daysUntilStockout: p.daysUntilStockout ?? 999,
    urgency: p.risk,
    reorderRecommendation: p.recommendation,
  }))

  return {
    predictions,
    criticalCount: internal.predictions.filter(p => p.risk === 'critical').length,
    aiAnalysis: internal.overallAnalysis,
    generatedAt: internal.generatedAt,
  }
}

/**
 * Get inventory predictions — cache-first (8h TTL), then Gemini, then heuristic.
 */
export async function getInventoryPredictions(
  companyId: string
): Promise<FrontendInventoryPredictionsData> {
  // 1. Try cache
  const cached = await readCache<{ predictions: InventoryPrediction[]; overallAnalysis: string }>(
    companyId,
    CACHE_KEY
  )
  if (cached && !cached.isStale) {
    const internal: InternalInventoryPredictionsData = {
      predictions: cached.data.predictions,
      overallAnalysis: cached.data.overallAnalysis,
      generatedAt: cached.generatedAt,
      model: cached.model,
      isStale: false,
    }
    return toFrontendFormat(internal)
  }

  // 2. Aggregate data
  const [inventory, materialUsage] = await Promise.all([
    fetchInventory(companyId),
    fetchMaterialUsage(companyId),
  ])

  if (inventory.length === 0) {
    return {
      predictions: [],
      criticalCount: 0,
      aiAnalysis: 'Brak pozycji w magazynie. Dodaj materialy aby zobaczyc predykcje.',
      generatedAt: new Date().toISOString(),
    }
  }

  // 3. Build heuristic predictions first
  const heuristic = generateHeuristicPredictions(inventory, materialUsage)

  // 4. Try Gemini for AI-enhanced analysis
  const criticalOrWarning = heuristic.predictions.filter(p => p.risk !== 'ok')
  if (criticalOrWarning.length > 0) {
    const aiResult = await callGemini<{
      recommendations: Array<{ materialName: string; recommendation: string }>
      overallAnalysis: string
    }>({
      label: 'inventory-predictions',
      prompt: buildPrompt(heuristic.predictions),
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          recommendations: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                materialName: { type: SchemaType.STRING },
                recommendation: { type: SchemaType.STRING, description: 'Rekomendacja po polsku' },
              },
              required: ['materialName', 'recommendation'],
            },
          },
          overallAnalysis: { type: SchemaType.STRING, description: 'Ogolna analiza magazynu po polsku, 2-3 zdania' },
        },
        required: ['recommendations', 'overallAnalysis'],
      },
      temperature: 0.3,
    })

    if (aiResult) {
      for (const rec of aiResult.data.recommendations) {
        const prediction = heuristic.predictions.find(
          p => p.materialName.toLowerCase() === rec.materialName.toLowerCase()
        )
        if (prediction) {
          prediction.recommendation = rec.recommendation
        }
      }
      heuristic.overallAnalysis = aiResult.data.overallAnalysis
      heuristic.model = aiResult.model
    }
  }

  // 5. Cache
  await writeCache(
    companyId,
    CACHE_KEY,
    { predictions: heuristic.predictions, overallAnalysis: heuristic.overallAnalysis },
    CACHE_TTL_HOURS,
    heuristic.model
  )

  return toFrontendFormat(heuristic)
}

/**
 * Force refresh inventory predictions.
 */
export async function refreshInventoryPredictions(
  companyId: string
): Promise<FrontendInventoryPredictionsData> {
  const [inventory, materialUsage] = await Promise.all([
    fetchInventory(companyId),
    fetchMaterialUsage(companyId),
  ])

  if (inventory.length === 0) {
    return {
      predictions: [],
      criticalCount: 0,
      aiAnalysis: 'Brak pozycji w magazynie.',
      generatedAt: new Date().toISOString(),
    }
  }

  const heuristic = generateHeuristicPredictions(inventory, materialUsage)

  const criticalOrWarning = heuristic.predictions.filter(p => p.risk !== 'ok')
  if (criticalOrWarning.length > 0) {
    const aiResult = await callGemini<{
      recommendations: Array<{ materialName: string; recommendation: string }>
      overallAnalysis: string
    }>({
      label: 'inventory-predictions-refresh',
      prompt: buildPrompt(heuristic.predictions),
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          recommendations: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                materialName: { type: SchemaType.STRING },
                recommendation: { type: SchemaType.STRING },
              },
              required: ['materialName', 'recommendation'],
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
        const prediction = heuristic.predictions.find(
          (p: InventoryPrediction) => p.materialName.toLowerCase() === rec.materialName.toLowerCase()
        )
        if (prediction) {
          prediction.recommendation = rec.recommendation
        }
      }
      heuristic.overallAnalysis = aiResult.data.overallAnalysis
      heuristic.model = aiResult.model
    }
  }

  await writeCache(
    companyId,
    CACHE_KEY,
    { predictions: heuristic.predictions, overallAnalysis: heuristic.overallAnalysis },
    CACHE_TTL_HOURS,
    heuristic.model
  )

  return toFrontendFormat(heuristic)
}

// ============================================
// EXPORTED SERVER ACTIONS (async functions with server dependencies)
// ============================================

export interface ReorderAlert {
  itemId: string
  itemName: string
  currentStock: number
  reorderPoint: number
  urgency: 'critical' | 'warning' | 'ok'
}

/**
 * Get items that need reordering.
 */
export async function getReorderAlerts(companyId: string): Promise<ReorderAlert[]> {
  const [inventory, materialUsage] = await Promise.all([
    fetchInventory(companyId),
    fetchMaterialUsage(companyId),
  ])

  const weeksInWindow = 90 / 7
  const alerts: ReorderAlert[] = []

  for (const item of inventory) {
    const nameLower = item.name.toLowerCase()
    const usage = materialUsage.find(u => u.material.toLowerCase() === nameLower)
    const dailyRate = usage ? (usage.mentionCount / weeksInWindow) / 7 : 0

    if (dailyRate <= 0) continue

    const { reorderPoint } = calculateReorderPoint({
      dailyUsageRate: dailyRate,
      leadTimeDays: 5, // Default 5-day lead time
    })

    if (item.quantity <= reorderPoint) {
      const stockout = predictStockoutDate({ currentStock: item.quantity, dailyUsageRate: dailyRate })
      alerts.push({
        itemId: item.name, // Using name as ID since inventory table doesn't have exposed ID here
        itemName: item.name,
        currentStock: item.quantity,
        reorderPoint,
        urgency: stockout.urgency,
      })
    }
  }

  // Sort by urgency
  const urgencyOrder: Record<string, number> = { critical: 0, warning: 1, ok: 2 }
  alerts.sort((a, b) => (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2))

  return alerts
}

export interface ItemPrediction {
  currentStock: number
  dailyUsageRate: number
  daysUntilStockout: number
  reorderPoint: number
  trend: UsageTrendResult
  urgency: 'critical' | 'warning' | 'ok'
}

/**
 * Get full prediction for a single inventory item.
 */
export async function getInventoryPrediction(
  companyId: string,
  itemId: string
): Promise<ItemPrediction> {
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('inventory')
    .select('name, quantity')
    .eq('company_id', companyId)
    .eq('id', itemId)
    .single()

  const currentStock = item?.quantity || 0

  // Get usage
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: orders } = await supabase
    .from('orders')
    .select('quantity, created_at')
    .eq('company_id', companyId)
    .ilike('material', `%${item?.name || ''}%`)
    .gte('created_at', ninetyDaysAgo.toISOString())

  const totalConsumed = (orders || []).reduce((s, o) => s + (o.quantity || 0), 0)
  const velocity = calculateUsageVelocity({ totalConsumed, periodDays: 90 })
  const stockout = predictStockoutDate({ currentStock, dailyUsageRate: velocity.dailyRate })
  const reorder = calculateReorderPoint({ dailyUsageRate: velocity.dailyRate, leadTimeDays: 5 })

  return {
    currentStock,
    dailyUsageRate: velocity.dailyRate,
    daysUntilStockout: stockout.daysUntilStockout,
    reorderPoint: reorder.reorderPoint,
    trend: analyzeUsageTrend([]),
    urgency: stockout.urgency,
  }
}

export interface LowStockPrediction {
  itemId: string
  itemName: string
  currentStock: number
  daysUntilStockout: number
  urgency: 'critical' | 'warning' | 'ok'
}

/**
 * Get predictions for all low-stock items.
 */
export async function getLowStockPredictions(
  companyId: string
): Promise<LowStockPrediction[]> {
  const [inventory, materialUsage] = await Promise.all([
    fetchInventory(companyId),
    fetchMaterialUsage(companyId),
  ])

  const weeksInWindow = 90 / 7
  const results: LowStockPrediction[] = []

  for (const item of inventory) {
    // Only include items with low stock threshold set and below it
    if (item.low_stock_threshold && item.quantity <= item.low_stock_threshold) {
      const nameLower = item.name.toLowerCase()
      const usage = materialUsage.find(u => u.material.toLowerCase() === nameLower)
      const dailyRate = usage ? (usage.mentionCount / weeksInWindow) / 7 : 0

      const stockout = predictStockoutDate({ currentStock: item.quantity, dailyUsageRate: dailyRate })

      results.push({
        itemId: item.name,
        itemName: item.name,
        currentStock: item.quantity,
        daysUntilStockout: stockout.daysUntilStockout === Infinity ? -1 : stockout.daysUntilStockout,
        urgency: stockout.urgency,
      })
    }
  }

  const urgencyOrder: Record<string, number> = { critical: 0, warning: 1, ok: 2 }
  results.sort((a, b) => (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2))

  return results
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildPrompt(predictions: InventoryPrediction[]): string {
  const data = predictions.slice(0, 20).map(p => ({
    material: p.materialName,
    quantity: p.currentQuantity,
    velocityPerWeek: p.usageVelocityPerWeek,
    daysUntilStockout: p.daysUntilStockout,
    risk: p.risk,
  }))

  return `Jestes specjalista od zarzadzania magazynem w warsztacie CNC. Przygotuj rekomendacje dotyczace zapasow.

DANE MAGAZYNOWE:
${JSON.stringify(data, null, 2)}

ZASADY:
- Dla KAZDEGO materialu z ryzykiem "critical" lub "warning" podaj KONKRETNA rekomendacje po polsku
- overallAnalysis: 2-3 zdania ogolnej oceny stanu magazynu
- Priorytet: materialy z ryzykiem "critical"
- Rekomendacje powinny zawierac: co zamowic, ile, kiedy
- Nie wymyslaj danych — opieraj sie na podanych liczbach`
}
