// Supabase Realtime Client - Subscriptions
import { supabase } from '@/lib/supabase'
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>

// Subscription registry to prevent duplicates
const activeChannels = new Map<string, RealtimeChannel>()

function getOrCreateChannel(channelName: string): { channel: RealtimeChannel; isNew: boolean } {
  const existing = activeChannels.get(channelName)
  if (existing) {
    return { channel: existing, isNew: false }
  }
  const channel = supabase.channel(channelName)
  activeChannels.set(channelName, channel)
  return { channel, isNew: true }
}

export function removeChannel(channelName: string) {
  const channel = activeChannels.get(channelName)
  if (channel) {
    supabase.removeChannel(channel)
    activeChannels.delete(channelName)
  }
}

export function subscribeToOrders(
  companyId: string,
  callback: (payload: RealtimePayload) => void
) {
  const channelName = 'orders-changes'
  const { channel, isNew } = getOrCreateChannel(channelName)

  if (!isNew) {
    return channel
  }

  return channel
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
  const channelName = 'notifications-changes'
  const { channel, isNew } = getOrCreateChannel(channelName)

  if (!isNew) {
    return channel
  }

  return channel
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
  const channelName = 'time-logs-changes'
  const { channel, isNew } = getOrCreateChannel(channelName)

  if (!isNew) {
    return channel
  }

  return channel
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
  const channelName = 'inventory-changes'
  const { channel, isNew } = getOrCreateChannel(channelName)

  if (!isNew) {
    return channel
  }

  return channel
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
