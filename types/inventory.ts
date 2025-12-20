// ============================================
// types/inventory.ts
// Inventory Location Types (Stany Magazynowe)
// Po refaktoryzacji: inventory → products + inventory_locations
// ============================================

// ============================================
// NOWA STRUKTURA (po refaktoryzacji)
// ============================================

export interface InventoryLocation {
  id: string
  product_id: string

  // Lokalizacja
  location_code: string

  // Stany
  quantity: number
  reserved_quantity: number
  available_quantity: number  // computed: quantity - reserved_quantity

  // Progi
  low_stock_threshold: number | null
  reorder_point: number | null

  // Audyt
  last_counted_at: string | null
  last_movement_at: string | null

  notes: string | null

  created_at: string
  updated_at: string
}

export interface InventoryLocationWithProduct extends InventoryLocation {
  product: {
    id: string
    sku: string
    name: string
    category: string
    unit: string
    default_unit_cost: number | null
  }
}

export interface InventoryBatch {
  id: string
  location_id: string

  batch_number: string | null
  quantity: number
  unit_cost: number | null

  supplier: string | null
  purchase_order_number: string | null
  received_date: string | null
  expiry_date: string | null

  created_at: string
}

export interface InventoryMovement {
  id: string
  location_id: string
  batch_id: string | null

  movement_type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: number

  reference_type: string | null
  reference_id: string | null
  reason: string | null

  created_by: number | null
  created_at: string
}

// Helper functions dla NOWEJ struktury
export function isLowStock(location: InventoryLocation): boolean {
  if (!location.low_stock_threshold) return false
  return location.available_quantity <= location.low_stock_threshold
}

export function getStockStatus(location: InventoryLocation): 'ok' | 'low' | 'out' {
  if (location.available_quantity <= 0) return 'out'
  if (isLowStock(location)) return 'low'
  return 'ok'
}

export function formatLocation(code: string): string {
  // np. "A1-01-02" → "Regał A1, Półka 01, Pozycja 02"
  const parts = code.split('-')
  if (parts.length === 3) {
    return `Regał ${parts[0]}, Półka ${parts[1]}, Pozycja ${parts[2]}`
  }
  return code
}

export function getStockStatusColor(location: InventoryLocation): string {
  const status = getStockStatus(location)
  if (status === 'out') return 'bg-red-600'
  if (status === 'low') return 'bg-yellow-600'
  return 'bg-green-600'
}

export function getStockPercentageByLocation(location: InventoryLocation): number {
  if (!location.low_stock_threshold || location.low_stock_threshold === 0) return 100
  return (location.available_quantity / location.low_stock_threshold) * 100
}

// ============================================
// STARA STRUKTURA (zachowana dla kompatybilności)
// @deprecated - używaj ProductWithLocations zamiast InventoryItem
// ============================================

export type InventoryCategory =
  | 'rawMaterial'
  | 'part'
  | 'tool'
  | 'consumable'
  | 'finishedGood'

export type InventoryUnit = 'kg' | 'm' | 'szt' | 'l'

/**
 * @deprecated Użyj Product + InventoryLocation zamiast tego
 * Ten interfejs jest zachowany tylko dla kompatybilności wstecznej
 */
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
 * @deprecated - Użyj isLowStock(location: InventoryLocation)
 */
export function isLowStockOld(item: InventoryItem): boolean {
  return item.quantity <= item.low_stock_threshold
}

/**
 * @deprecated - Użyj getStockPercentageByLocation
 */
export function getStockPercentageOld(item: InventoryItem): number {
  if (item.low_stock_threshold === 0) return 100
  return (item.quantity / item.low_stock_threshold) * 100
}

/**
 * Check if item is near expiry (within 30 days)
 */
export function isNearExpiry(item: InventoryItem | InventoryBatch): boolean {
  if (!item.expiry_date) return false
  const expiryDate = new Date(item.expiry_date)
  const today = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilExpiry <= 30 && daysUntilExpiry > 0
}

/**
 * Check if item is expired
 */
export function isExpired(item: InventoryItem | InventoryBatch): boolean {
  if (!item.expiry_date) return false
  const expiryDate = new Date(item.expiry_date)
  const today = new Date()
  return expiryDate < today
}

/**
 * @deprecated - Calculate total inventory value (old structure)
 */
export function getTotalValue(items: InventoryItem[]): number {
  return items.reduce((sum, item) => {
    const value = (item.unit_cost || 0) * item.quantity
    return sum + value
  }, 0)
}

/**
 * @deprecated - Get inventory statistics by category (old structure)
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
    if (isLowStockOld(item)) {
      stats[category].lowStockCount++
    }
  })

  return stats
}
