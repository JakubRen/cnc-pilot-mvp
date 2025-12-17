// ============================================
// types/inventory.ts
// Inventory entity types and utilities
// ============================================

export type InventoryCategory =
  | 'rawMaterial'
  | 'part'
  | 'tool'
  | 'consumable'
  | 'finishedGood'

export type InventoryUnit = 'kg' | 'm' | 'szt' | 'l'

export interface InventoryItem {
  id: string
  company_id: string
  sku: string
  name: string
  category: InventoryCategory
  quantity: number
  unit: InventoryUnit
  low_stock_threshold: number
  location: string | null
  supplier: string | null
  unit_cost: number | null
  batch_number: string | null
  expiry_date: string | null
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
}

export interface InventoryFormData {
  sku: string
  name: string
  category: InventoryCategory
  quantity: number
  unit: InventoryUnit
  low_stock_threshold: number
  location?: string
  supplier?: string
  unit_cost?: number
  batch_number?: string
  expiry_date?: string
  notes?: string
}

export interface InventoryAuditLog {
  id: string
  inventory_id: string
  action: 'add' | 'remove' | 'adjust' | 'edit'
  previous_quantity: number | null
  new_quantity: number
  change_amount: number
  user_id: number
  reason: string | null
  created_at: string
}

export interface InventoryWithAudit extends InventoryItem {
  inventory_audit_log?: InventoryAuditLog[]
  creator?: {
    full_name: string
  }
}

export const categoryLabels: Record<InventoryCategory, string> = {
  rawMaterial: 'Materiał Surowy',
  part: 'Część',
  tool: 'Narzędzie',
  consumable: 'Materiał Zużywalny',
  finishedGood: 'Gotowy Produkt',
}

export const categoryIcons: Record<InventoryCategory, string> = {
  rawMaterial: '🏗️',
  part: '⚙️',
  tool: '🔧',
  consumable: '📦',
  finishedGood: '✅',
}

export const unitLabels: Record<InventoryUnit, string> = {
  kg: 'kilogramy',
  m: 'metry',
  szt: 'sztuki',
  l: 'litry',
}

/**
 * Check if inventory item is low on stock
 */
export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.low_stock_threshold
}

/**
 * Calculate stock percentage (current / threshold)
 */
export function getStockPercentage(item: InventoryItem): number {
  if (item.low_stock_threshold === 0) return 100
  return (item.quantity / item.low_stock_threshold) * 100
}

/**
 * Get stock status color
 */
export function getStockStatusColor(item: InventoryItem): string {
  const percentage = getStockPercentage(item)
  if (percentage <= 50) return 'bg-red-600'
  if (percentage <= 100) return 'bg-yellow-600'
  return 'bg-green-600'
}

/**
 * Check if item is near expiry (within 30 days)
 */
export function isNearExpiry(item: InventoryItem): boolean {
  if (!item.expiry_date) return false
  const expiryDate = new Date(item.expiry_date)
  const today = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilExpiry <= 30 && daysUntilExpiry > 0
}

/**
 * Check if item is expired
 */
export function isExpired(item: InventoryItem): boolean {
  if (!item.expiry_date) return false
  const expiryDate = new Date(item.expiry_date)
  const today = new Date()
  return expiryDate < today
}

/**
 * Calculate total inventory value
 */
export function getTotalValue(items: InventoryItem[]): number {
  return items.reduce((sum, item) => {
    const value = (item.unit_cost || 0) * item.quantity
    return sum + value
  }, 0)
}

/**
 * Get inventory statistics by category
 */
export function getInventoryStatsByCategory(items: InventoryItem[]): Record<InventoryCategory, {
  count: number
  totalQuantity: number
  totalValue: number
  lowStockCount: number
}> {
  const stats: Record<InventoryCategory, any> = {
    rawMaterial: { count: 0, totalQuantity: 0, totalValue: 0, lowStockCount: 0 },
    part: { count: 0, totalQuantity: 0, totalValue: 0, lowStockCount: 0 },
    tool: { count: 0, totalQuantity: 0, totalValue: 0, lowStockCount: 0 },
    consumable: { count: 0, totalQuantity: 0, totalValue: 0, lowStockCount: 0 },
    finishedGood: { count: 0, totalQuantity: 0, totalValue: 0, lowStockCount: 0 },
  }

  items.forEach(item => {
    const category = item.category
    stats[category].count++
    stats[category].totalQuantity += item.quantity
    stats[category].totalValue += (item.unit_cost || 0) * item.quantity
    if (isLowStock(item)) {
      stats[category].lowStockCount++
    }
  })

  return stats
}
