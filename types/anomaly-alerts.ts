// Anomaly Alerts types

export type AnomalySeverity = 'warning' | 'critical'

export type AnomalyType = 'time_overrun' | 'deadline_risk' | 'stale_order' | 'cost_overrun'

export interface AnomalyExplanation {
  /** Root cause analysis (1 sentence, Polish) */
  cause: string
  /** Recommended action (1 sentence, Polish) */
  action: string
}

export interface AnomalyAlert {
  type: AnomalyType
  severity: AnomalySeverity
  icon: string
  title: string
  description: string
  orderId: string
  orderNumber: string
  /** e.g. "180%" for time overrun, "2 dni" for deadline risk */
  metric: string
  /** AI-generated contextual explanation (optional, populated by enrichWithAI) */
  aiExplanation?: AnomalyExplanation
}

export interface AnomalyAlertsData {
  alerts: AnomalyAlert[]
  generatedAt: string
}
