// ============================================
// Production Plans Types
// ============================================
// Production plans represent the technical layer between orders and operations
// Separate from commercial order_items to maintain clear separation of concerns

export type ProductionPlanStatus =
  | 'draft'         // Plan created but not approved
  | 'active'        // Approved and ready for production
  | 'in_progress'   // Production started
  | 'completed'     // All operations finished
  | 'cancelled'     // Plan cancelled

export interface ProductionPlan {
  id: string
  company_id: string
  plan_number: string // PP-2025-0001

  // Relations
  order_id: string | null
  order_item_id: string | null

  // Product details
  part_name: string
  quantity: number
  material: string | null

  // Dimensions (optional)
  length: number | null
  width: number | null
  height: number | null

  // Technical data
  drawing_file_id: string | null
  technical_notes: string | null

  // Status
  status: ProductionPlanStatus
  is_active: boolean

  // Cost summary (calculated from operations)
  total_setup_time_minutes: number
  total_run_time_minutes: number
  estimated_cost: number | null
  actual_cost: number | null

  // Approval
  approved_by: number | null
  approved_at: string | null

  // Metadata
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface ProductionPlanWithRelations extends ProductionPlan {
  order?: {
    id: string
    order_number: string
    customer_name: string
    deadline: string
    status: string
  }
  order_item?: {
    id: string
    part_name: string
    quantity: number
  }
  operations?: Array<{
    id: string
    operation_number: number
    operation_type: string
    status: string
    setup_time_minutes: number | null
    run_time_per_unit_minutes: number | null
  }>
  drawing_file?: {
    id: string
    file_name: string
    file_url: string
  }
  created_by_user?: {
    id: number
    full_name: string
  }
  approved_by_user?: {
    id: number
    full_name: string
  }
}

export interface ProductionPlanFormData {
  order_id?: string
  order_item_id?: string
  part_name: string
  quantity: number
  material?: string
  length?: number
  width?: number
  height?: number
  drawing_file_id?: string
  technical_notes?: string
  status?: ProductionPlanStatus
}

// ============================================
// Status Labels & Colors
// ============================================

export const productionPlanStatusLabels: Record<ProductionPlanStatus, string> = {
  draft: 'Szkic',
  active: 'Aktywny',
  in_progress: 'W Realizacji',
  completed: 'Ukończony',
  cancelled: 'Anulowany',
}

export const productionPlanStatusColors: Record<ProductionPlanStatus, string> = {
  draft: 'bg-slate-600',
  active: 'bg-blue-600',
  in_progress: 'bg-purple-600',
  completed: 'bg-green-600',
  cancelled: 'bg-gray-600',
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate total estimated time for production plan
 */
export function getTotalEstimatedTime(plan: ProductionPlan): number {
  return plan.total_setup_time_minutes + plan.total_run_time_minutes
}

/**
 * Calculate estimated time per unit
 */
export function getTimePerUnit(plan: ProductionPlan): number {
  if (plan.quantity === 0) return 0
  return plan.total_run_time_minutes / plan.quantity
}

/**
 * Calculate estimated cost per unit
 */
export function getCostPerUnit(plan: ProductionPlan): number {
  if (plan.quantity === 0 || !plan.estimated_cost) return 0
  return plan.estimated_cost / plan.quantity
}

/**
 * Check if production plan is overdue based on order deadline
 */
export function isPlanOverdue(plan: ProductionPlanWithRelations): boolean {
  if (!plan.order?.deadline) return false
  if (plan.status === 'completed' || plan.status === 'cancelled') return false

  const deadline = new Date(plan.order.deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return deadline < today
}

/**
 * Calculate completion percentage based on operations
 */
export function getCompletionPercentage(plan: ProductionPlanWithRelations): number {
  if (!plan.operations || plan.operations.length === 0) return 0

  const completedOps = plan.operations.filter(op => op.status === 'completed').length
  return Math.round((completedOps / plan.operations.length) * 100)
}

/**
 * Check if plan can be activated (has operations and is in draft)
 */
export function canActivatePlan(plan: ProductionPlanWithRelations): boolean {
  return (
    plan.status === 'draft' &&
    plan.operations !== undefined &&
    plan.operations.length > 0
  )
}

/**
 * Check if plan can be started (is active and has operations)
 */
export function canStartPlan(plan: ProductionPlanWithRelations): boolean {
  return (
    plan.status === 'active' &&
    plan.operations !== undefined &&
    plan.operations.length > 0
  )
}

/**
 * Format production plan dimensions
 */
export function formatDimensions(plan: ProductionPlan): string | null {
  const { length, width, height } = plan

  if (!length && !width && !height) return null

  const parts = []
  if (length) parts.push(`${length}mm`)
  if (width) parts.push(`${width}mm`)
  if (height) parts.push(`${height}mm`)

  return parts.join(' × ')
}

/**
 * Get production plan progress status text
 */
export function getProgressText(plan: ProductionPlanWithRelations): string {
  if (!plan.operations || plan.operations.length === 0) {
    return 'Brak operacji'
  }

  const completedOps = plan.operations.filter(op => op.status === 'completed').length
  const totalOps = plan.operations.length

  if (completedOps === 0) return 'Nierozpoczęty'
  if (completedOps === totalOps) return 'Ukończony'

  return `${completedOps}/${totalOps} operacji`
}

/**
 * Calculate actual vs estimated time variance
 */
export function getTimeVariance(plan: ProductionPlan): number | null {
  // TODO: Implement when actual_duration tracking is added to operations
  return null
}

/**
 * Calculate actual vs estimated cost variance
 */
export function getCostVariance(plan: ProductionPlan): number | null {
  if (!plan.estimated_cost || !plan.actual_cost) return null
  return plan.actual_cost - plan.estimated_cost
}

/**
 * Get priority label based on deadline and status
 */
export function getPriorityLabel(plan: ProductionPlanWithRelations): string {
  if (!plan.order?.deadline) return 'Normalny'
  if (plan.status === 'completed' || plan.status === 'cancelled') return 'Ukończony'

  const deadline = new Date(plan.order.deadline)
  const today = new Date()
  const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntil < 0) return 'Opóźniony'
  if (daysUntil <= 2) return 'Pilny'
  if (daysUntil <= 7) return 'Ważny'
  return 'Normalny'
}

/**
 * Get priority color class
 */
export function getPriorityColor(plan: ProductionPlanWithRelations): string {
  const priority = getPriorityLabel(plan)

  switch (priority) {
    case 'Opóźniony': return 'text-red-600 bg-red-50'
    case 'Pilny': return 'text-orange-600 bg-orange-50'
    case 'Ważny': return 'text-yellow-600 bg-yellow-50'
    case 'Ukończony': return 'text-green-600 bg-green-50'
    default: return 'text-slate-600 bg-slate-50'
  }
}
