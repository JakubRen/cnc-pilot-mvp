import { createClient } from '@/lib/supabase-server'
import { fetchCompanyBranding } from './fetch-company'
import type { OrderSummaryPdfData, OrderProductionPlanSummary } from './types'

/**
 * Fetch order data for PDF generation.
 * Returns null if order not found or doesn't belong to the given company.
 */
export async function fetchOrderPdfData(
  orderId: string,
  companyId: string
): Promise<OrderSummaryPdfData | null> {
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      created_at,
      deadline,
      customer_name,
      part_name,
      material,
      quantity,
      notes,
      total_cost,
      material_cost,
      labor_cost,
      overhead_cost,
      company_id,
      created_by
    `)
    .eq('id', orderId)
    .eq('company_id', companyId)
    .single()

  if (error || !order) return null

  // Fetch creator name
  let creatorName: string | null = null
  if (order.created_by) {
    const { data: creator } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', order.created_by)
      .single()
    creatorName = creator?.full_name || null
  }

  // Fetch production plans linked to this order (include id for operations count)
  const { data: rawPlans } = await supabase
    .from('production_plans')
    .select(`
      id,
      plan_number,
      part_name,
      status,
      total_setup_time_minutes,
      total_run_time_minutes,
      estimated_cost
    `)
    .eq('order_id', orderId)
    .eq('company_id', companyId)
    .order('plan_number', { ascending: true })

  // Count operations for each plan
  const productionPlans: OrderProductionPlanSummary[] = []
  for (const plan of rawPlans || []) {
    const { count } = await supabase
      .from('operations')
      .select('id', { count: 'exact', head: true })
      .eq('production_plan_id', plan.id)

    productionPlans.push({
      plan_number: plan.plan_number,
      part_name: plan.part_name,
      status: plan.status,
      total_setup_time_minutes: plan.total_setup_time_minutes,
      total_run_time_minutes: plan.total_run_time_minutes,
      estimated_cost: plan.estimated_cost,
      operations_count: count || 0,
    })
  }

  const company = await fetchCompanyBranding(companyId)

  return {
    order_number: order.order_number,
    status: order.status,
    created_at: order.created_at,
    deadline: order.deadline,
    customer_name: order.customer_name,
    part_name: order.part_name,
    material: order.material,
    quantity: order.quantity,
    notes: order.notes,
    total_cost: order.total_cost,
    material_cost: order.material_cost,
    labor_cost: order.labor_cost,
    overhead_cost: order.overhead_cost,
    production_plans: productionPlans,
    company,
    creator_name: creatorName,
  }
}
