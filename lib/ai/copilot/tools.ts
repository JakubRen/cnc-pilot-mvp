'use server'

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import type {
  SearchOrdersParams,
  SearchOrdersResult,
  SearchInventoryParams,
  SearchInventoryResult,
  GetProductionPlanParams,
} from '@/types/copilot'

// ============================================
// Tool 1: search_orders
// ============================================

export async function searchOrders(
  companyId: string,
  params: SearchOrdersParams
): Promise<SearchOrdersResult[]> {
  const supabase = await createClient()

  let q = supabase
    .from('orders')
    .select('id, order_number, customer_name, part_name, material, quantity, status, deadline, selling_price, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 10)

  if (params.status) q = q.eq('status', params.status)
  if (params.customer_name) q = q.ilike('customer_name', `%${params.customer_name}%`)
  if (params.query) {
    q = q.or(`part_name.ilike.%${params.query}%,customer_name.ilike.%${params.query}%,order_number.ilike.%${params.query}%`)
  }
  if (params.date_from) q = q.gte('created_at', params.date_from)
  if (params.date_to) q = q.lte('created_at', params.date_to)

  const { data, error } = await q

  if (error) {
    logger.error('[copilot/tools] searchOrders error', { error })
    return []
  }
  return (data || []) as SearchOrdersResult[]
}

// ============================================
// Tool 2: search_inventory
// Reuse logic from app/api/agents/parse-quote/route.ts
// ============================================

export async function searchInventory(
  companyId: string,
  params: SearchInventoryParams
): Promise<SearchInventoryResult[]> {
  const supabase = await createClient()
  const searchTerm = `%${params.query}%`

  let q = supabase
    .from('products')
    .select('id, name, sku, category, unit, description, inventory_locations(available_quantity)')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .limit(10)

  if (params.category) q = q.eq('category', params.category)

  const { data, error } = await q

  if (error) {
    logger.error('[copilot/tools] searchInventory error', { error })
    return []
  }

  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    unit: p.unit,
    description: p.description,
    available_quantity: (p.inventory_locations as Array<{ available_quantity: number }>)
      .reduce((sum, loc) => sum + (Number(loc.available_quantity) || 0), 0),
  }))
}

// ============================================
// Tool 3: get_customer
// Reuse from lib/ai/customer-intelligence.ts
// ============================================

export async function getCustomer(companyId: string, customerName: string) {
  // Dynamic import to avoid circular 'use server' issues
  const { getCustomerIntelligence, analyzeBuyingPatterns } = await import('@/lib/ai/customer-intelligence')

  const [intelligence, patterns] = await Promise.all([
    getCustomerIntelligence(companyId),
    analyzeBuyingPatterns(companyId, customerName),
  ])

  // Find this customer in churn risks
  const customer = intelligence?.churnRisks?.find(
    (c: { customerName: string }) => c.customerName.toLowerCase() === customerName.toLowerCase()
  ) || null

  return {
    name: customerName,
    profile: customer,
    buyingPatterns: patterns,
    aiAnalysis: intelligence?.aiAnalysis || null,
  }
}

// ============================================
// Tool 4: check_deadlines
// Reuse from lib/ai/features/deadline-monitor.ts
// ============================================

export async function checkDeadlines(companyId: string, daysAhead?: number) {
  const { getOrderCompletionLikelihoods } = await import('@/lib/ai/features/deadline-monitor')
  return getOrderCompletionLikelihoods(companyId, daysAhead ?? 7)
}

// ============================================
// Tool 5: generate_quote
// Reuse from lib/ai/price-estimator.ts
// ============================================

export async function generateQuote(params: {
  material: string
  dimensions?: string
  complexity?: 'low' | 'medium' | 'high'
  quantity?: number
  additionalNotes?: string
}) {
  const { estimatePrice } = await import('@/lib/ai/price-estimator')
  return estimatePrice(params)
}

// ============================================
// Tool 6: get_production_plan
// Reuse from lib/ai/features/production-plan-generator.ts
// ============================================

export async function getProductionPlan(companyId: string, params: GetProductionPlanParams) {
  const { generateProductionPlan } = await import('@/lib/ai/features/production-plan-generator')
  return generateProductionPlan({
    partName: params.partName,
    material: params.material,
    quantity: params.quantity,
    complexity: params.complexity,
    dimensions: null,
    technicalNotes: null,
    companyId,
  })
}

// ============================================
// Tool 7: run_demand_forecast
// ============================================

export async function runDemandForecast(companyId: string, params: { days?: number }) {
  const { forecastDemand } = await import('@/lib/ai/features/demand-forecast')
  const months = Math.max(1, Math.round((params.days || 30) / 30))
  return forecastDemand(companyId, { months })
}

// ============================================
// Tool 8: run_revenue_forecast
// ============================================

export async function runRevenueForecast(companyId: string, params: { days?: number }) {
  const { forecastRevenue } = await import('@/lib/ai/features/revenue-forecast')
  return forecastRevenue(companyId, { months: Math.max(1, Math.round((params.days || 30) / 30)) })
}

// ============================================
// Tool 9: check_auto_reorder
// ============================================

export async function checkAutoReorder(companyId: string) {
  const { getAutoReorderDrafts } = await import('@/lib/ai/features/auto-reorder')
  return getAutoReorderDrafts(companyId)
}

// ============================================
// Tool 10: run_dynamic_pricing
// ============================================

export async function runDynamicPricing(
  _companyId: string,
  params: { partName: string; material?: string; quantity: number; complexity?: string }
) {
  const { getDynamicPriceSuggestion } = await import('@/lib/ai/features/dynamic-pricing')
  return getDynamicPriceSuggestion({
    partName: params.partName,
    material: params.material || 'stal',
    quantity: params.quantity,
    complexity: (params.complexity as 'simple' | 'medium' | 'complex') || 'medium',
  }, 0)
}

// ============================================
// Tool 11: check_completion_risks
// ============================================

export async function checkCompletionRisks(companyId: string, params: { days_ahead?: number }) {
  const { getOrderCompletionLikelihoods } = await import('@/lib/ai/features/deadline-monitor')
  const likelihoods = await getOrderCompletionLikelihoods(companyId, params.days_ahead || 7)
  return {
    orders: likelihoods.map(l => ({
      order_number: l.orderNumber,
      customer: l.customerName,
      deadline: l.deadline,
      days_remaining: l.daysRemaining,
      completion_likelihood: l.completionLikelihood,
      risk: l.risk,
      progress: l.productionProgress,
      summary: l.statusSummary,
    })),
    critical_count: likelihoods.filter(l => l.risk === 'critical').length,
    at_risk_count: likelihoods.filter(l => l.risk === 'at_risk').length,
  }
}

// ============================================
// Tool 12: get_workshop_status (compound)
// ============================================

export async function getWorkshopStatus(companyId: string) {
  const [completionRisks, autoReorder] = await Promise.all([
    checkCompletionRisks(companyId, { days_ahead: 7 }),
    checkAutoReorder(companyId),
  ])

  const reorderCount = Array.isArray(autoReorder) ? autoReorder.length
    : (autoReorder as { drafts?: unknown[] })?.drafts?.length || 0

  const alerts: string[] = []
  if (completionRisks.critical_count > 0) {
    alerts.push(`${completionRisks.critical_count} zamówień KRYTYCZNIE zagrożonych`)
  }
  if (completionRisks.at_risk_count > 0) {
    alerts.push(`${completionRisks.at_risk_count} zamówień zagrożonych opóźnieniem`)
  }
  if (reorderCount > 0) {
    alerts.push(`${reorderCount} pozycji do zamówienia u dostawców`)
  }

  return {
    type: 'workshop_status',
    completion_risks: completionRisks,
    auto_reorder_items: reorderCount,
    alerts,
    overall_status: completionRisks.critical_count > 0 ? 'critical'
      : (completionRisks.at_risk_count > 0 || reorderCount > 0) ? 'warning'
      : 'ok',
  }
}
