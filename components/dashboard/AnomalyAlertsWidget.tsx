'use client'

import Link from 'next/link'
import type { AnomalyAlertsData, AnomalyAlert } from '@/types/anomaly-alerts'

interface Props {
  data: AnomalyAlertsData
}

const severityStyles: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-100 dark:border-red-900/30',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    text: 'text-red-600 dark:text-red-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-100 dark:border-amber-900/30',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    text: 'text-amber-600 dark:text-amber-400',
  },
}

const typeLabels: Record<string, string> = {
  time_overrun: 'CZAS',
  deadline_risk: 'DEADLINE',
  stale_order: 'NIEAKTYWNE',
  cost_overrun: 'KOSZT',
}

function AlertItem({ alert }: { alert: AnomalyAlert }) {
  const styles = severityStyles[alert.severity] || severityStyles.warning

  return (
    <Link
      href={`/orders/${alert.orderId}`}
      className={`block ${styles.bg} border ${styles.border} rounded-lg p-3 mb-2 hover:opacity-80 transition group`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">
            {alert.icon} {alert.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {alert.description}
          </p>
          {alert.aiExplanation && (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Przyczyna:</span> {alert.aiExplanation.cause}
              </p>
              <p className="text-xs text-foreground/90 font-medium">
                Rekomendacja: {alert.aiExplanation.action}
              </p>
            </div>
          )}
        </div>
        <span className={`text-[10px] uppercase font-bold ${styles.badge} px-2 py-1 rounded whitespace-nowrap`}>
          {typeLabels[alert.type] || alert.type}
        </span>
      </div>
    </Link>
  )
}

export default function AnomalyAlertsWidget({ data }: Props) {
  const { alerts } = data
  const criticalCount = alerts.filter(a => a.severity === 'critical').length

  const containerClass = 'bg-card rounded-lg p-6 shadow-sm border border-border'

  if (alerts.length === 0) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Anomalie Produkcyjne</h2>
        </div>
        <div className="text-center py-6">
          <p className="text-lg mb-2 text-green-600 dark:text-green-400">✓</p>
          <p className="text-sm font-medium text-green-600 dark:text-green-400">Brak anomalii</p>
          <p className="text-xs text-muted-foreground mt-1">Wszystkie zlecenia w normie</p>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">
          Anomalie Produkcyjne ({alerts.length})
        </h2>
        {criticalCount > 0 && (
          <span className="text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-2 py-1 rounded">
            {criticalCount} krytycznych
          </span>
        )}
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {alerts.slice(0, 10).map((alert, i) => (
          <AlertItem key={`${alert.orderId}-${alert.type}-${i}`} alert={alert} />
        ))}
      </div>

      {alerts.length > 10 && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          +{alerts.length - 10} kolejnych anomalii
        </p>
      )}
    </div>
  )
}
