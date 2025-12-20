// ============================================
// Product (Towary) Types
// ============================================

import { InventoryLocation } from './inventory'

export type ProductCategory =
  | 'raw_material'      // Materiał surowy
  | 'finished_good'     // Wyrób gotowy
  | 'semi_finished'     // Półprodukt
  | 'tool'              // Narzędzie
  | 'consumable'        // Materiał zużywalny

export type ProductUnit = 'kg' | 'm' | 'szt' | 'l'

export interface ProductSpecifications {
  length?: number      // mm
  width?: number       // mm
  height?: number      // mm
  weight?: number      // kg
  diameter?: number    // mm
  thickness?: number   // mm
  standard?: string    // np. "ISO 9001"
  [key: string]: any   // elastyczność
}

export interface Product {
  id: string
  company_id: string

  // Identyfikatory
  sku: string
  name: string

  // Klasyfikacja
  category: ProductCategory
  unit: ProductUnit

  // Opis
  description: string | null
  specifications: ProductSpecifications | null

  // Dane biznesowe
  default_unit_cost: number | null
  manufacturer: string | null
  manufacturer_sku: string | null

  // Status
  is_active: boolean

  // Metadata
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface ProductWithLocations extends Product {
  locations: InventoryLocation[]
  total_quantity: number
  total_value: number
}

export interface ProductFormData {
  sku: string
  name: string
  category: ProductCategory
  unit: ProductUnit
  description?: string
  specifications?: ProductSpecifications
  default_unit_cost?: number
  manufacturer?: string
  manufacturer_sku?: string
}

// Labels
export const productCategoryLabels: Record<ProductCategory, string> = {
  raw_material: 'Materiał Surowy',
  finished_good: 'Wyrób Gotowy',
  semi_finished: 'Półprodukt',
  tool: 'Narzędzie',
  consumable: 'Materiał Zużywalny',
}

export const productUnitLabels: Record<ProductUnit, string> = {
  kg: 'Kilogramy',
  m: 'Metry',
  szt: 'Sztuki',
  l: 'Litry',
}

// Helper functions
export function getTotalQuantity(product: ProductWithLocations): number {
  return product.locations.reduce((sum, loc) => sum + loc.available_quantity, 0)
}

export function getTotalValue(product: ProductWithLocations): number {
  if (!product.default_unit_cost) return 0
  return getTotalQuantity(product) * product.default_unit_cost
}

export function isLowStockAnyLocation(product: ProductWithLocations): boolean {
  return product.locations.some(loc =>
    loc.available_quantity <= (loc.low_stock_threshold || 0)
  )
}

export function formatProductCategory(category: ProductCategory): string {
  return productCategoryLabels[category] || category
}

export function formatProductUnit(unit: ProductUnit): string {
  return productUnitLabels[unit] || unit
}
