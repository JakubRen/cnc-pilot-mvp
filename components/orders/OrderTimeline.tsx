'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ActivityLog } from '@/components/ui/ActivityLog'
import { logger } from '@/lib/logger'

interface TimelineEvent {
  id: string
  user: { name: string }
  action: string
  details?: string
  timestamp: Date | string
  type: 'create' | 'update' | 'delete' | 'comment' | 'status'
}

interface OrderTimelineProps {
  orderId: string
  companyId: string
}

export default function OrderTimeline({ orderId, companyId }: OrderTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchTimeline() {
      setIsLoading(true)

      try {
        // Fetch all 3 sources in parallel
        const [auditResult, timeLogsResult, qcResult] = await Promise.all([
          // 1. Audit logs for this order
          supabase
            .from('audit_logs')
            .select(`
              id,
              action,
              description,
              changed_fields,
              old_data,
              new_data,
              created_at,
              user:users!audit_logs_user_id_fkey (full_name)
            `)
            .eq('table_name', 'orders')
            .eq('record_id', orderId)
            .order('created_at', { ascending: false })
            .limit(50),

          // 2. Time logs for this order
          supabase
            .from('time_logs')
            .select(`
              id,
              status,
              start_time,
              end_time,
              duration_seconds,
              created_at,
              users (full_name)
            `)
            .eq('order_id', orderId)
            .order('created_at', { ascending: false })
            .limit(50),

          // 3. QC measurements for this order
          supabase
            .from('quality_measurements')
            .select(`
              id,
              is_pass,
              measured_value,
              measured_at,
              quality_control_items (name),
              users:users!quality_measurements_created_by_fkey (full_name)
            `)
            .eq('order_id', orderId)
            .order('measured_at', { ascending: false })
            .limit(30),
        ])

        const timeline: TimelineEvent[] = []

        // Process audit logs
        if (auditResult.data) {
          for (const log of auditResult.data) {
            const userName = Array.isArray(log.user)
              ? (log.user[0] as { full_name: string })?.full_name
              : (log.user as { full_name: string } | null)?.full_name

            let action = log.description || `${log.action}`
            let details: string | undefined
            let type: TimelineEvent['type'] = 'update'

            if (log.action === 'INSERT') {
              type = 'create'
              action = 'Utworzono zamówienie'
            } else if (log.action === 'DELETE') {
              type = 'delete'
              action = 'Usunięto zamówienie'
            } else if (log.action === 'UPDATE') {
              // Check if status changed
              const oldStatus = (log.old_data as Record<string, unknown>)?.status
              const newStatus = (log.new_data as Record<string, unknown>)?.status
              if (oldStatus && newStatus && oldStatus !== newStatus) {
                type = 'status'
                action = `Zmiana statusu: ${oldStatus} → ${newStatus}`
              } else if (log.changed_fields && log.changed_fields.length > 0) {
                details = `Zmieniono: ${log.changed_fields.join(', ')}`
              }
            }

            timeline.push({
              id: `audit-${log.id}`,
              user: { name: userName || 'System' },
              action,
              details,
              timestamp: log.created_at,
              type,
            })
          }
        }

        // Process time logs
        if (timeLogsResult.data) {
          for (const log of timeLogsResult.data) {
            const userName = Array.isArray(log.users)
              ? (log.users[0] as { full_name: string })?.full_name
              : (log.users as { full_name: string } | null)?.full_name

            let action = ''
            let type: TimelineEvent['type'] = 'update'

            if (log.status === 'running' || log.status === 'pending') {
              action = 'Rozpoczęto pracę'
              type = 'status'
            } else if (log.status === 'completed') {
              const hours = log.duration_seconds
                ? Math.round(log.duration_seconds / 3600 * 10) / 10
                : 0
              action = `Zakończono pracę (${hours}h)`
              type = 'status'
            } else {
              action = `Timer: ${log.status}`
            }

            timeline.push({
              id: `timer-${log.id}`,
              user: { name: userName || 'Nieznany' },
              action,
              timestamp: log.start_time || log.created_at,
              type,
            })
          }
        }

        // Process QC measurements
        if (qcResult.data) {
          for (const m of qcResult.data) {
            const userName = Array.isArray(m.users)
              ? (m.users[0] as { full_name: string })?.full_name
              : (m.users as { full_name: string } | null)?.full_name

            const itemName = Array.isArray(m.quality_control_items)
              ? (m.quality_control_items[0] as { name: string })?.name
              : (m.quality_control_items as { name: string } | null)?.name

            timeline.push({
              id: `qc-${m.id}`,
              user: { name: userName || 'QC' },
              action: `Pomiar QC: ${itemName || 'parametr'} — ${m.is_pass ? '✅ OK' : '❌ NOK'}`,
              details: m.measured_value != null ? `Wartość: ${m.measured_value}` : undefined,
              timestamp: m.measured_at,
              type: 'comment',
            })
          }
        }

        // Sort all events by timestamp (newest first)
        timeline.sort((a, b) => {
          const dateA = new Date(a.timestamp).getTime()
          const dateB = new Date(b.timestamp).getTime()
          return dateB - dateA
        })

        setEvents(timeline)
      } catch (error) {
        logger.error('Failed to fetch order timeline', { error, orderId })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTimeline()
  }, [orderId, companyId])

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">Historia zamówienia</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card p-6 rounded-lg border border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Historia zamówienia ({events.length})
      </h2>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Brak zdarzeń do wyświetlenia
        </p>
      ) : (
        <ActivityLog items={events} maxItems={50} />
      )}
    </div>
  )
}
