// Anomaly detection for production orders
// Pure SQL — no AI, no external API calls

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import type { AnomalyAlert, AnomalyAlertsData } from '@/types/anomaly-alerts'

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

      // 3. STALE ORDER — in_progress for 14+ days, no significant time logged recently
      if (order.status === 'in_progress' && order.created_at) {
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
