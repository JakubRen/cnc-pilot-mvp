// AI Report Summary types
// Used by: lib/ai/report-summary.ts

export type ReportType = 'costs' | 'orders' | 'inventory' | 'time'

export interface ReportAISummary {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  trend: 'improving' | 'stable' | 'declining' | 'mixed'
}

export interface ReportSummaryResponse {
  summary: ReportAISummary
  generatedAt: string
  model: string
  isStale: boolean
}
