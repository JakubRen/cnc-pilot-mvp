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
    .subscribe()
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
    .subscribe()
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
    .subscribe()
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
    .subscribe()
}
