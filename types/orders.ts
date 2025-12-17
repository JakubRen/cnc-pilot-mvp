// ============================================
// types/orders.ts
// Order entity types and utilities
// ============================================

export type OrderStatus =
  | 'pending'
  | 'in_progress'
  | 'external_processing'
  | 'completed'
  | 'delayed'
  | 'cancelled'

export interface Order {
  id: string
  company_id: string
  order_number: string
  customer_name: string
  quantity: number
  part_name: string
  material: string | null
  deadline: string
  status: OrderStatus
  notes: string | null
  total_cost: number | null
  material_cost: number | null
  labor_cost: number | null
  overhead_cost: number | null
  created_by: number
  created_at: string
  updated_at: string
}

export interface OrderFormData {
  order_number: string
  customer_name: string
  quantity: number
  part_name: string
  material?: string
  deadline: string
  notes?: string
  total_cost?: number
  material_cost?: number
  labor_cost?: number
  overhead_cost?: number
}

export interface OrderWithProduction extends Order {
  production_plans?: {
    id: string
    status: string
    total_setup_time: number
    total_run_time: number
    estimated_cost: number
  }[]
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Oczekujące',
  in_progress: 'W Realizacji',
  external_processing: 'U Kooperanta',
  completed: 'Ukończone',
  delayed: 'Opóźnione',
  cancelled: 'Anulowane',
}

export const orderStatusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-600',
  in_progress: 'bg-blue-600',
  external_processing: 'bg-purple-600',
  completed: 'bg-green-600',
  delayed: 'bg-red-600',
  cancelled: 'bg-gray-600',
}

export const orderStatusTextColors: Record<OrderStatus, string> = {
  pending: 'text-yellow-100',
  in_progress: 'text-blue-100',
  external_processing: 'text-purple-100',
  completed: 'text-green-100',
  delayed: 'text-red-100',
  cancelled: 'text-gray-100',
}

/**
 * Helper function to check if order is overdue
 */
export function isOrderOverdue(order: Order): boolean {
  if (order.status === 'completed' || order.status === 'cancelled') {
    return false
  }
  const deadline = new Date(order.deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return deadline < today
}

/**
 * Helper function to get days until deadline
 */
export function getDaysUntilDeadline(order: Order): number {
  const deadline = new Date(order.deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  const diffTime = deadline.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Helper function to calculate order profit margin
 */
export function getOrderProfitMargin(order: Order): number | null {
  if (!order.total_cost) return null
  const costs = (order.material_cost || 0) + (order.labor_cost || 0) + (order.overhead_cost || 0)
  if (costs === 0) return null
  return ((order.total_cost - costs) / order.total_cost) * 100
}
