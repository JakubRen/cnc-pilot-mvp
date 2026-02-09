// Anomaly Alerts types

export type AnomalySeverity = 'warning' | 'critical'

export type AnomalyType = 'time_overrun' | 'deadline_risk' | 'stale_order' | 'cost_overrun'

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
}

export interface AnomalyAlertsData {
  alerts: AnomalyAlert[]
  generatedAt: string
}
