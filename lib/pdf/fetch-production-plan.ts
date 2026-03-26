import { createClient } from '@/lib/supabase-server'
import { fetchCompanyBranding } from './fetch-company'
import type { ProductionPlanPdfData, OperationPdfData } from './types'

/**
 * Fetch production plan data for PDF generation.
 * Returns null if plan not found or doesn't belong to the given company.
 */
export async function fetchProductionPlanPdfData(
  planId: string,
  companyId: string
): Promise<ProductionPlanPdfData | null> {
  const supabase = await createClient()

  const { data: plan, error } = await supabase
    .from('production_plans')
    .select(`
      id,
      plan_number,
      status,
      created_at,
      part_name,
      quantity,
      material,
      length,
      width,
      height,
      technical_notes,
      total_setup_time_minutes,
      total_run_time_minutes,
      estimated_cost,
      company_id,
      order_id
    `)
    .eq('id', planId)
    .eq('company_id', companyId)
    .single()

  if (error || !plan) return null

  // Fetch order context (if linked)
  let orderNumber: string | null = null
  let customerName: string | null = null
  let deadline: string | null = null

  if (plan.order_id) {
    const { data: order } = await supabase
      .from('orders')
      .select('order_number, customer_name, deadline')
      .eq('id', plan.order_id)
      .single()

    if (order) {
      orderNumber = order.order_number
      customerName = order.customer_name
      deadline = order.deadline
    }
  }

  // Fetch operations
  const { data: rawOps } = await supabase
    .from('operations')
    .select(`
      operation_number,
      operation_type,
      operation_name,
      setup_time_minutes,
      run_time_per_unit_minutes,
      total_setup_cost,
      total_run_cost,
      total_operation_cost,
      status,
      assigned_operator_id,
      machine_id
    `)
    .eq('production_plan_id', planId)
    .order('operation_number', { ascending: true })

  // Resolve machine names and operator names in parallel
  const operations: OperationPdfData[] = []
  for (const op of rawOps || []) {
    let machineName: string | null = null
    let assignedOperator: string | null = null

    if (op.machine_id) {
      const { data: machine } = await supabase
        .from('machines')
        .select('name')
        .eq('id', op.machine_id)
        .single()
      machineName = machine?.name || null
    }

    if (op.assigned_operator_id) {
      const { data: user } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', op.assigned_operator_id)
        .single()
      assignedOperator = user?.full_name || null
    }

    operations.push({
      operation_number: op.operation_number,
      operation_type: op.operation_type,
      operation_name: op.operation_name,
      machine_name: machineName,
      setup_time_minutes: op.setup_time_minutes,
      run_time_per_unit_minutes: op.run_time_per_unit_minutes,
      total_setup_cost: op.total_setup_cost,
      total_run_cost: op.total_run_cost,
      total_operation_cost: op.total_operation_cost,
      status: op.status,
      assigned_operator: assignedOperator,
    })
  }

  const company = await fetchCompanyBranding(companyId)

  return {
    plan_number: plan.plan_number,
    status: plan.status,
    created_at: plan.created_at,
    order_number: orderNumber,
    customer_name: customerName,
    deadline,
    part_name: plan.part_name,
    quantity: plan.quantity,
    material: plan.material,
    dimensions:
      plan.length || plan.width || plan.height
        ? { length: plan.length, width: plan.width, height: plan.height }
        : null,
    technical_notes: plan.technical_notes,
    total_setup_time_minutes: plan.total_setup_time_minutes,
    total_run_time_minutes: plan.total_run_time_minutes,
    estimated_cost: plan.estimated_cost,
    operations,
    company,
  }
}
