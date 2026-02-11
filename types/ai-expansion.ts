// Types for AI Expansion features (Report Summaries, Customer Intelligence, Inventory Predictions)

// ─── Report AI Summaries ───

export type TrendDirection = 'improving' | 'stable' | 'declining' | 'mixed'

export interface ReportFinding {
  icon: string
  text: string
  severity: 'positive' | 'warning' | 'critical' | 'info'
}

export interface ReportRecommendation {
  text: string
  priority: 'high' | 'medium' | 'low'
}

export interface AIReportSummaryData {
  summary: string
  findings: ReportFinding[]
  recommendations: ReportRecommendation[]
  trend: TrendDirection
  generatedAt: string
}

export type ReportType = 'costs' | 'orders' | 'inventory' | 'time'

// ─── Feature 3: Customer Intelligence ───

export type ChurnRiskLevel = 'high' | 'medium' | 'low'

export interface CustomerChurnRisk {
  customerId: string
  customerName: string
  riskLevel: ChurnRiskLevel
  lastOrderDate: string | null
  orderCount: number
  totalRevenue: number
  daysSinceLastOrder: number
  riskFactors: string[]
}

export interface CustomerIntelligenceData {
  churnRisks: CustomerChurnRisk[]
  inactiveCount: number
  atRiskRevenue: number
  aiAnalysis: string | null
  generatedAt: string
}

// ─── Feature 4: Inventory Predictions ───

export type StockoutUrgency = 'critical' | 'warning' | 'ok'

export interface InventoryPrediction {
  itemId: string
  itemName: string
  sku: string
  currentStock: number
  usageVelocity: number // units per day
  daysUntilStockout: number
  urgency: StockoutUrgency
  reorderRecommendation: string | null
}

export interface InventoryPredictionsData {
  predictions: InventoryPrediction[]
  criticalCount: number
  aiAnalysis: string | null
  generatedAt: string
}
