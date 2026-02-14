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

export interface CLVPrediction {
  /** Predicted annual revenue from this customer (PLN) */
  annualValue: number
  /** Expected lifetime in years based on activity pattern */
  expectedLifetimeYears: number
  /** Total predicted lifetime value (PLN) */
  lifetimeValue: number
  /** Confidence: 'high' (5+ orders), 'medium' (2-4), 'low' (1 order) */
  confidence: 'high' | 'medium' | 'low'
}

export interface CustomerRiskProfile {
  customerName: string
  churnRisk: ChurnRisk
  daysSinceLastOrder: number
  buyingPattern: BuyingPattern
  aiRecommendation: string
  /** Customer Lifetime Value prediction (heuristic) */
  clv?: CLVPrediction
}

export interface CustomerIntelligenceData {
  customers: CustomerRiskProfile[]
  overallAnalysis: string
  generatedAt: string
  model: string
  isStale: boolean
}
