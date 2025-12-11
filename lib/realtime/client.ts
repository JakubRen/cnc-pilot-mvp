// Supabase Realtime Client - Subscriptions
import { supabase } from '@/lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>

export function subscribeToOrders(
  companyId: string,
  callback: (payload: RealtimePayload) => void
) {
  return supabase
    .channel('orders-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `company_id=eq.${companyId}`
      },
      callback
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Realtime: subscribed to orders')
      }
      if (status === 'CHANNEL_ERROR' || err) {
        logger.error('Realtime orders subscription error', { status, error: err })
      }
    })
}

export function subscribeToNotifications(
  userId: number,
  callback: (payload: RealtimePayload) => void
) {
  return supabase
    .channel('notifications-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Realtime: subscribed to notifications')
      }
      if (status === 'CHANNEL_ERROR' || err) {
        logger.error('Realtime notifications subscription error', { status, error: err })
      }
    })
}

export function subscribeToTimeLogs(
  companyId: string,
  callback: (payload: RealtimePayload) => void
) {
  return supabase
    .channel('time-logs-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'time_logs',
        filter: `company_id=eq.${companyId}`
      },
      callback
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Realtime: subscribed to time_logs')
      }
      if (status === 'CHANNEL_ERROR' || err) {
        logger.error('Realtime time_logs subscription error', { status, error: err })
      }
    })
}

export function subscribeToInventory(
  companyId: string,
  callback: (payload: RealtimePayload) => void
) {
  return supabase
    .channel('inventory-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `company_id=eq.${companyId}`
      },
      callback
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Realtime: subscribed to inventory')
      }
      if (status === 'CHANNEL_ERROR' || err) {
        logger.error('Realtime inventory subscription error', { status, error: err })
      }
    })
}
