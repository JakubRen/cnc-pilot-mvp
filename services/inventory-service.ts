// Inventory Service - Centralized business logic for inventory management
import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type InventoryUnit = 'kg' | 'm' | 'szt' | 'l' | 'mb' | 'ark'

export interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  quantity: number
  unit: InventoryUnit
  low_stock_threshold: number
  location: string | null
  batch_number: string | null
  company_id: string
  created_by: number | null
  created_at: string
  updated_at: string
  // Relations
  creator?: { full_name: string } | null
}

export interface CreateInventoryInput {
  sku: string
  name: string
  category: string
  quantity: number
  unit: InventoryUnit
  low_stock_threshold: number
  location?: string | null
  batch_number?: string | null
  created_by?: number | null
}

export interface UpdateInventoryInput {
  sku?: string
  name?: string
  category?: string
  quantity?: number
  unit?: InventoryUnit
  low_stock_threshold?: number
  location?: string | null
  batch_number?: string | null
}

export interface InventoryFilters {
  category?: string | 'all'
  search?: string
  lowStockOnly?: boolean
  location?: string | null
}

export interface InventoryAuditEntry {
  id: string
  inventory_id: string
  action: 'added' | 'removed' | 'adjusted' | 'created' | 'updated' | 'deleted'
  quantity_change: number | null
  quantity_after: number | null
  reason: string | null
  performed_by: number
  company_id: string
  created_at: string
  // Relations
  performer?: { full_name: string } | null
  inventory_item?: { name: string; sku: string } | null
}

export class InventoryService {
  private supabase!: SupabaseClient
  private companyId: string

  constructor(companyId: string) {
    this.companyId = companyId
  }

  async init() {
    this.supabase = await createClient()
  }

  /**
   * Get all inventory items with optional filtering
   */
  async getInventory(filters?: InventoryFilters): Promise<InventoryItem[]> {
    let query = this.supabase
      .from('inventory')
      .select('*, creator:users!created_by(full_name)')
      .eq('company_id', this.companyId)
      .order('name', { ascending: true })

    // Apply filters
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters?.search) {
      query = query.or(`sku.ilike.%${filters.search}%,name.ilike.%${filters.search}%`)
    }

    if (filters?.lowStockOnly) {
      query = query.filter('quantity', 'lt', 'low_stock_threshold')
    }

    if (filters?.location) {
      query = query.eq('location', filters.location)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch inventory: ${error.message}`)
    return data as InventoryItem[]
  }

  /**
   * Get a single inventory item by ID
   */
  async getInventoryItemById(id: string): Promise<InventoryItem> {
    const { data, error } = await this.supabase
      .from('inventory')
      .select('*, creator:users!created_by(full_name)')
      .eq('id', id)
      .eq('company_id', this.companyId)
      .single()

    if (error) throw new Error(`Failed to fetch inventory item: ${error.message}`)
    if (!data) throw new Error('Inventory item not found')

    return data as InventoryItem
  }

  /**
   * Create a new inventory item
   */
  async createInventoryItem(input: CreateInventoryInput, createdBy: number): Promise<InventoryItem> {
    const { data, error } = await this.supabase
      .from('inventory')
      .insert({
        ...input,
        company_id: this.companyId,
        created_by: createdBy,
      })
      .select('*, creator:users!created_by(full_name)')
      .single()

    if (error) throw new Error(`Failed to create inventory item: ${error.message}`)

    // Log audit entry
    await this.logAuditEntry({
      inventory_id: data.id,
      action: 'created',
      quantity_change: input.quantity,
      quantity_after: input.quantity,
      reason: 'Initial creation',
      performed_by: createdBy,
    })

    return data as InventoryItem
  }

  /**
   * Update an existing inventory item
   */
  async updateInventoryItem(id: string, input: UpdateInventoryInput, performedBy: number): Promise<InventoryItem> {
    // Get current item for audit
    const currentItem = await this.getInventoryItemById(id)

    const { data, error } = await this.supabase
      .from('inventory')
      .update(input)
      .eq('id', id)
      .eq('company_id', this.companyId)
      .select('*, creator:users!created_by(full_name)')
      .single()

    if (error) throw new Error(`Failed to update inventory item: ${error.message}`)
    if (!data) throw new Error('Inventory item not found or access denied')

    // Log audit entry if quantity changed
    if (input.quantity !== undefined && input.quantity !== currentItem.quantity) {
      await this.logAuditEntry({
        inventory_id: id,
        action: 'adjusted',
        quantity_change: input.quantity - currentItem.quantity,
        quantity_after: input.quantity,
        reason: 'Manual adjustment',
        performed_by: performedBy,
      })
    }

    return data as InventoryItem
  }

  /**
   * Delete an inventory item
   */
  async deleteInventoryItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('inventory')
      .delete()
      .eq('id', id)
      .eq('company_id', this.companyId)

    if (error) throw new Error(`Failed to delete inventory item: ${error.message}`)
  }

  /**
   * Add stock to an inventory item
   */
  async addStock(
    id: string,
    quantityToAdd: number,
    reason: string,
    performedBy: number
  ): Promise<InventoryItem> {
    const item = await this.getInventoryItemById(id)
    const newQuantity = item.quantity + quantityToAdd

    const { data, error } = await this.supabase
      .from('inventory')
      .update({ quantity: newQuantity })
      .eq('id', id)
      .eq('company_id', this.companyId)
      .select('*, creator:users!created_by(full_name)')
      .single()

    if (error) throw new Error(`Failed to add stock: ${error.message}`)

    // Log audit entry
    await this.logAuditEntry({
      inventory_id: id,
      action: 'added',
      quantity_change: quantityToAdd,
      quantity_after: newQuantity,
      reason,
      performed_by: performedBy,
    })

    return data as InventoryItem
  }

  /**
   * Remove stock from an inventory item
   */
  async removeStock(
    id: string,
    quantityToRemove: number,
    reason: string,
    performedBy: number
  ): Promise<InventoryItem> {
    const item = await this.getInventoryItemById(id)

    if (item.quantity < quantityToRemove) {
      throw new Error(`Insufficient stock. Available: ${item.quantity}, requested: ${quantityToRemove}`)
    }

    const newQuantity = item.quantity - quantityToRemove

    const { data, error } = await this.supabase
      .from('inventory')
      .update({ quantity: newQuantity })
      .eq('id', id)
      .eq('company_id', this.companyId)
      .select('*, creator:users!created_by(full_name)')
      .single()

    if (error) throw new Error(`Failed to remove stock: ${error.message}`)

    // Log audit entry
    await this.logAuditEntry({
      inventory_id: id,
      action: 'removed',
      quantity_change: -quantityToRemove,
      quantity_after: newQuantity,
      reason,
      performed_by: performedBy,
    })

    return data as InventoryItem
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(): Promise<InventoryItem[]> {
    const { data, error } = await this.supabase
      .from('inventory')
      .select('*, creator:users!created_by(full_name)')
      .eq('company_id', this.companyId)
      .filter('quantity', 'lt', 'low_stock_threshold')
      .order('quantity', { ascending: true })

    if (error) throw new Error(`Failed to fetch low stock items: ${error.message}`)
    return data as InventoryItem[]
  }

  /**
   * Get all inventory categories
   */
  async getCategories(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('inventory')
      .select('category')
      .eq('company_id', this.companyId)
      .order('category')

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`)

    // Get unique categories
    const categories = [...new Set(data?.map((item: { category: string }) => item.category) || [])]
    return categories
  }

  /**
   * Get inventory audit trail
   */
  async getAuditTrail(inventoryId?: string, limit = 50): Promise<InventoryAuditEntry[]> {
    let query = this.supabase
      .from('inventory_audit')
      .select('*, performer:users!performed_by(full_name), inventory_item:inventory(name, sku)')
      .eq('company_id', this.companyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (inventoryId) {
      query = query.eq('inventory_id', inventoryId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Failed to fetch audit trail: ${error.message}`)
    return data as InventoryAuditEntry[]
  }

  /**
   * Log an audit entry (private helper)
   */
  private async logAuditEntry(entry: {
    inventory_id: string
    action: 'added' | 'removed' | 'adjusted' | 'created' | 'updated' | 'deleted'
    quantity_change: number | null
    quantity_after: number | null
    reason: string
    performed_by: number
  }): Promise<void> {
    const { error } = await this.supabase.from('inventory_audit').insert({
      ...entry,
      company_id: this.companyId,
    })

    if (error) {
      const { logger } = await import('@/lib/logger')
      logger.error('Failed to log audit entry', { error: error.message })
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }
}
