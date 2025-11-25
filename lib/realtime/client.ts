// Supabase Realtime Client - Subscriptions
import { supabase } from '@/lib/supabase'

export function subscribeToOrders(
  companyId: string,
  callback: (payload: any) => void
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
        console.log('Realtime: subscribed to orders')
      }
      if (status === 'CHANNEL_ERROR' || err) {
        console.error('Realtime orders subscription error:', { status, err })
      }
    })
}

export function subscribeToNotifications(
  userId: number,
  callback: (payload: any) => void
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
        console.log('Realtime: subscribed to notifications')
      }
      if (status === 'CHANNEL_ERROR' || err) {
        console.error('Realtime notifications subscription error:', { status, err })
      }
    })
}

export function subscribeToTimeLogs(
  companyId: string,
  callback: (payload: any) => void
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
        console.log('Realtime: subscribed to time_logs')
      }
      if (status === 'CHANNEL_ERROR' || err) {
        console.error('Realtime time_logs subscription error:', { status, err })
      }
    })
}

export function subscribeToInventory(
  companyId: string,
  callback: (payload: any) => void
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
        console.log('Realtime: subscribed to inventory')
      }
      if (status === 'CHANNEL_ERROR' || err) {
        console.error('Realtime inventory subscription error:', { status, err })
      }
    })
}
