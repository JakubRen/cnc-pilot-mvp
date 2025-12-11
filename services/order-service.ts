// Order Service - Centralized business logic for orders
import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Order {
  id: string
  order_number: string
  customer_name: string
  part_name: string | null
  material: string | null
  quantity: number
  deadline: string | null
  status: OrderStatus
  priority: OrderPriority | null
  notes: string | null
  company_id: string
  created_by: number | null
  created_at: string
  updated_at: string
  material_cost: number | null
  labor_cost: number | null
  additional_costs: number | null
  total_cost: number | null
  margin_percent: number | null
  estimated_hours: number | null
  // Relations
  creator?: { full_name: string } | null
  tags?: Array<{ id: string; name: string }>
}

export interface CreateOrderInput {
  order_number: string
  customer_name: string
  part_name?: string | null
  material?: string | null
  quantity: number
  deadline?: string | null
  status?: OrderStatus
  priority?: OrderPriority | null
  notes?: string | null
  material_cost?: number | null
  labor_cost?: number | null
  additional_costs?: number | null
  total_cost?: number | null
  margin_percent?: number | null
  estimated_hours?: number | null
  created_by?: number | null
}

export interface UpdateOrderInput {
  order_number?: string
  customer_name?: string
  part_name?: string | null
  material?: string | null
  quantity?: number
  deadline?: string | null
  status?: OrderStatus
  priority?: OrderPriority | null
  notes?: string | null
  material_cost?: number | null
  labor_cost?: number | null
  additional_costs?: number | null
  total_cost?: number | null
  margin_percent?: number | null
  estimated_hours?: number | null
}

export interface OrderFilters {
  status?: OrderStatus | 'all'
  search?: string
  dateFrom?: string | null
  dateTo?: string | null
  customer?: string | null
  priority?: OrderPriority | 'all'
}

export class OrderService {
  private supabase!: SupabaseClient
  private companyId: string

  constructor(companyId: string) {
    this.companyId = companyId
  }

  async init() {
    this.supabase = await createClient()
  }

  /**
   * Get all orders with optional filtering
   */
  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    let query = this.supabase
      .from('orders')
      .select('*, creator:users!created_by(full_name), tags(id, name)')
      .eq('company_id', this.companyId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority)
    }

    if (filters?.search) {
      query = query.or(
        `order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,part_name.ilike.%${filters.search}%`
      )
    }

    if (filters?.dateFrom) {
      query = query.gte('deadline', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('deadline', filters.dateTo)
    }

    if (filters?.customer) {
      query = query.ilike('customer_name', `%${filters.customer}%`)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch orders: ${error.message}`)
    return data as Order[]
  }

  /**
   * Get a single order by ID
   */
  async getOrderById(id: string): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*, creator:users!created_by(full_name), tags(id, name)')
      .eq('id', id)
      .eq('company_id', this.companyId)
      .single()

    if (error) throw new Error(`Failed to fetch order: ${error.message}`)
    if (!data) throw new Error('Order not found')

    return data as Order
  }

  /**
   * Create a new order
   */
  async createOrder(input: CreateOrderInput, createdBy: number): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .insert({
        ...input,
        company_id: this.companyId,
        created_by: createdBy,
        status: input.status || 'pending',
      })
      .select('*, creator:users!created_by(full_name)')
      .single()

    if (error) throw new Error(`Failed to create order: ${error.message}`)
    return data as Order
  }

  /**
   * Update an existing order
   */
  async updateOrder(id: string, input: UpdateOrderInput): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .update(input)
      .eq('id', id)
      .eq('company_id', this.companyId) // Security: ensure same company
      .select('*, creator:users!created_by(full_name)')
      .single()

    if (error) throw new Error(`Failed to update order: ${error.message}`)
    if (!data) throw new Error('Order not found or access denied')

    return data as Order
  }

  /**
   * Delete an order
   */
  async deleteOrder(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .eq('company_id', this.companyId)

    if (error) throw new Error(`Failed to delete order: ${error.message}`)
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.updateOrder(id, { status })
  }

  /**
   * Bulk update status for multiple orders
   */
  async bulkUpdateStatus(ids: string[], status: OrderStatus): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .update({ status })
      .in('id', ids)
      .eq('company_id', this.companyId)

    if (error) throw new Error(`Failed to bulk update orders: ${error.message}`)
  }

  /**
   * Get orders count by status
   */
  async getOrdersCountByStatus(): Promise<Record<OrderStatus, number>> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('status')
      .eq('company_id', this.companyId)

    if (error) throw new Error(`Failed to fetch order counts: ${error.message}`)

    const counts: Record<OrderStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      delayed: 0,
      cancelled: 0,
    }

    data?.forEach((order: { status: string }) => {
      if (order.status in counts) {
        counts[order.status as OrderStatus]++
      }
    })

    return counts
  }

  /**
   * Get overdue orders
   */
  async getOverdueOrders(): Promise<Order[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('orders')
      .select('*, creator:users!created_by(full_name)')
      .eq('company_id', this.companyId)
      .lt('deadline', today)
      .not('status', 'in', '(completed,cancelled)')
      .order('deadline', { ascending: true })

    if (error) throw new Error(`Failed to fetch overdue orders: ${error.message}`)
    return data as Order[]
  }

  /**
   * Get urgent orders (deadline within 3 days)
   */
  async getUrgentOrders(): Promise<Order[]> {
    const today = new Date()
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
    const todayStr = today.toISOString().split('T')[0]
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('orders')
      .select('*, creator:users!created_by(full_name)')
      .eq('company_id', this.companyId)
      .gte('deadline', todayStr)
      .lte('deadline', threeDaysStr)
      .not('status', 'in', '(completed,cancelled)')
      .order('deadline', { ascending: true })

    if (error) throw new Error(`Failed to fetch urgent orders: ${error.message}`)
    return data as Order[]
  }
}
