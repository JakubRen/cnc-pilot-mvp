// AI Customer Intelligence types
// Used by: lib/ai/customer-intelligence.ts

export type ChurnRisk = 'high' | 'medium' | 'low'

export interface BuyingPattern {
  avgOrderValue: number
  orderFrequencyDays: number
  preferredMaterials: string[]
  totalOrders: number
  totalRevenue: number
}

export interface CustomerRiskProfile {
  customerName: string
  churnRisk: ChurnRisk
  daysSinceLastOrder: number
  buyingPattern: BuyingPattern
  aiRecommendation: string
}

export interface CustomerIntelligenceData {
  customers: CustomerRiskProfile[]
  overallAnalysis: string
  generatedAt: string
  model: string
  isStale: boolean
}
