// AI Dashboard Insights types

export type InsightSeverity = 'positive' | 'warning' | 'critical' | 'info'

export type InsightType =
  | 'revenue_trend'
  | 'machine_utilization'
  | 'customer_activity'
  | 'margin_analysis'
  | 'deadline_risk'
  | 'inventory_alert'
  | 'productivity'

export interface AIInsight {
  type: InsightType
  severity: InsightSeverity
  icon: string
  title: string
  description: string
}

export interface AIInsightsData {
  insights: AIInsight[]
  generatedAt: string | null
  expiresAt: string | null
  model: string | null
  isStale: boolean
}

export interface InsightsDataSnapshot {
  revenueThisWeek: number
  revenuePreviousWeek: number
  revenueChangePercent: number
  overdueOrders: number
  avgMarginPercent: number
  inactiveCustomers: number
  deadlineRiskOrders: number
  lowStockCount: number
  completedThisWeek: number
  activeOrders: number
}
