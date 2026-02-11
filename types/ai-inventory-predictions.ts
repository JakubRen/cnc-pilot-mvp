// AI Inventory Predictions types
// Used by: lib/ai/inventory-predictions.ts

export type StockoutRisk = 'critical' | 'warning' | 'ok'

export interface InventoryPrediction {
  materialName: string
  currentQuantity: number
  usageVelocityPerWeek: number
  daysUntilStockout: number | null
  risk: StockoutRisk
  recommendation: string
}

export interface InventoryPredictionsData {
  predictions: InventoryPrediction[]
  overallAnalysis: string
  generatedAt: string
  model: string
  isStale: boolean
}
