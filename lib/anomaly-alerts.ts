// Anomaly detection for production orders
// Heuristic detection (pure SQL) + optional AI explanations

import { createClient } from '@/lib/supabase-server'
import { callGemini } from '@/lib/ai/gemini-client'
import { SchemaType } from '@/lib/ai/schema-types'
import { logger } from '@/lib/logger'
import type { AnomalyAlert, AnomalyAlertsData } from '@/types/anomaly-alerts'

// ============================================
// HEURISTIC ANOMALY DETECTION (always runs)
// ============================================

export async function getAnomalyAlerts(companyId: string): Promise<AnomalyAlertsData> {
  const alerts: AnomalyAlert[] = []

  try {
    const supabase = await createClient()

    // Fetch active/pending orders with time and cost data
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, status, deadline, estimated_hours, actual_labor_hours, actual_labor_cost, selling_price, created_at')
      .eq('company_id', companyId)
      .in('status', ['pending', 'in_progress'])
      .order('deadline', { ascending: true })

    if (error) {
      logger.error('Error fetching orders for anomaly detection', { error })
      return { alerts: [], generatedAt: new Date().toISOString() }
    }

    const now = new Date()

    for (const order of orders || []) {
      // 1. TIME OVERRUN — actual > 150% of estimated
      if (
        order.estimated_hours &&
        order.estimated_hours > 0 &&
        order.actual_labor_hours &&
        order.actual_labor_hours > order.estimated_hours * 1.5
      ) {
        const percent = Math.round((order.actual_labor_hours / order.estimated_hours) * 100)
        alerts.push({
          type: 'time_overrun',
          severity: percent >= 200 ? 'critical' : 'warning',
          icon: percent >= 200 ? '🔴' : '🟡',
          title: `${order.order_number} — przekroczenie czasu`,
          description: `Faktyczny czas: ${order.actual_labor_hours.toFixed(1)}h vs szacowany: ${order.estimated_hours.toFixed(1)}h (${percent}%). Klient: ${order.customer_name}`,
          orderId: order.id,
          orderNumber: order.order_number,
          metric: `${percent}%`,
        })
      }

      // 2. DEADLINE RISK — deadline in < 3 days, zero or minimal time logged
      if (order.deadline) {
        const deadline = new Date(order.deadline)
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysLeft <= 3 && daysLeft >= 0 && (!order.actual_labor_hours || order.actual_labor_hours === 0)) {
          alerts.push({
            type: 'deadline_risk',
            severity: daysLeft <= 1 ? 'critical' : 'warning',
            icon: daysLeft <= 1 ? '🔴' : '🟠',
            title: `${order.order_number} — deadline za ${daysLeft} dni`,
            description: `Zero zarejestrowanego czasu pracy. Klient: ${order.customer_name}. Deadline: ${deadline.toLocaleDateString('pl-PL')}`,
            orderId: order.id,
            orderNumber: order.order_number,
            metric: `${daysLeft} dni`,
          })
        }

      }

      // 3. STALE ORDER — pending/in_progress for 14+ days, no significant time logged
      if ((order.status === 'in_progress' || order.status === 'pending') && order.created_at) {
        const created = new Date(order.created_at)
        const daysSinceCreated = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceCreated >= 14 && (!order.actual_labor_hours || order.actual_labor_hours < 1)) {
          alerts.push({
            type: 'stale_order',
            severity: daysSinceCreated >= 30 ? 'critical' : 'warning',
            icon: '⏸️',
            title: `${order.order_number} — brak aktywności`,
            description: `Status "w toku" od ${daysSinceCreated} dni, mniej niż 1h pracy. Klient: ${order.customer_name}`,
            orderId: order.id,
            orderNumber: order.order_number,
            metric: `${daysSinceCreated} dni`,
          })
        }
      }

      // 4. COST OVERRUN — labor cost exceeds selling price
      if (
        order.selling_price &&
        order.selling_price > 0 &&
        order.actual_labor_cost &&
        order.actual_labor_cost > order.selling_price
      ) {
        const overrunPercent = Math.round((order.actual_labor_cost / order.selling_price) * 100)
        alerts.push({
          type: 'cost_overrun',
          severity: overrunPercent >= 150 ? 'critical' : 'warning',
          icon: '💸',
          title: `${order.order_number} — koszt przekracza cenę`,
          description: `Koszt pracy: ${order.actual_labor_cost.toFixed(0)} PLN vs cena: ${order.selling_price.toFixed(0)} PLN (${overrunPercent}%). Klient: ${order.customer_name}`,
          orderId: order.id,
          orderNumber: order.order_number,
          metric: `${overrunPercent}%`,
        })
      }
    }

    // Sort: critical first, then warning
    alerts.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1
      if (a.severity !== 'critical' && b.severity === 'critical') return 1
      return 0
    })

  } catch (err) {
    logger.error('Anomaly detection failed', { error: err })
  }

  return {
    alerts,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// AI ENRICHMENT (optional, additive)
// ============================================

/**
 * Enrich anomaly alerts with AI-generated explanations.
 * Batch call — sends all alerts to Gemini in one request.
 * If AI fails, alerts are returned unchanged (aiExplanation stays undefined).
 */
export async function enrichAlertsWithAI(
  alerts: AnomalyAlert[]
): Promise<AnomalyAlert[]> {
  if (alerts.length === 0) return alerts

  const alertSummaries = alerts.map((a, i) => ({
    index: i,
    type: a.type,
    severity: a.severity,
    title: a.title,
    description: a.description,
    metric: a.metric,
  }))

  const result = await callGemini<{
    explanations: Array<{ index: number; cause: string; action: string }>
  }>({
    label: 'anomaly-explanations',
    prompt: `Jestes ekspertem produkcji CNC. Dla kazdego alertu anomalii podaj po polsku:
- cause: co moze byc przyczyna problemu (1 zdanie, max 80 znakow)
- action: co konkretnie zrobic (1 zdanie, max 80 znakow)

ALERTY:
${JSON.stringify(alertSummaries, null, 2)}

ZASADY:
- Jeden obiekt {cause, action} na alert
- Konkretne, praktyczne porady
- Jezyk polski
- Nie powtarzaj opisu alertu — dodaj NOWA wartosc`,
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        explanations: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              index: { type: SchemaType.NUMBER, description: 'Index alertu (0-based)' },
              cause: { type: SchemaType.STRING, description: 'Przyczyna problemu, max 80 znakow' },
              action: { type: SchemaType.STRING, description: 'Rekomendowana akcja, max 80 znakow' },
            },
            required: ['index', 'cause', 'action'],
          },
        },
      },
      required: ['explanations'],
    },
    temperature: 0.3,
  })

  if (!result) {
    logger.warn('[anomaly-alerts] AI enrichment failed — returning alerts without explanations')
    return alerts
  }

  // Merge explanations into alerts
  for (const exp of result.data.explanations) {
    if (exp.index >= 0 && exp.index < alerts.length) {
      alerts[exp.index].aiExplanation = {
        cause: exp.cause,
        action: exp.action,
      }
    }
  }

  return alerts
}
