'use client'

import { useEffect, useState } from 'react'
import { subscribeToOrders, subscribeToNotifications, subscribeToTimeLogs } from './client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

type OrderRecord = Record<string, unknown> & { order_number?: string }
type NotificationRecord = Record<string, unknown> & { type?: string; title?: string }
type TimerRecord = Record<string, unknown> & { id?: string; status?: string; user_id?: number }

export function useRealtimeOrders(companyId: string) {
  const [updates, setUpdates] = useState<RealtimePostgresChangesPayload<OrderRecord>[]>([])

  useEffect(() => {
    if (!companyId) return

    const subscription = subscribeToOrders(companyId, (payload) => {
      const { eventType, new: newOrder, old: oldOrder } = payload

      setUpdates(prev => [...prev, payload as RealtimePostgresChangesPayload<OrderRecord>])

      if (eventType === 'INSERT' && newOrder) {
        const order = newOrder as OrderRecord
        toast.success(`Nowe zamówienie: ${order.order_number || 'N/A'}`)
      } else if (eventType === 'UPDATE' && newOrder) {
        const order = newOrder as OrderRecord
        toast(`Zaktualizowano: ${order.order_number || 'N/A'}`)
      } else if (eventType === 'DELETE' && oldOrder) {
        const order = oldOrder as OrderRecord
        toast.error(`Usunięto: ${order.order_number || 'N/A'}`)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [companyId])

  return updates
}

export function useRealtimeNotifications(userId: number) {
  const [newNotifications, setNewNotifications] = useState<NotificationRecord[]>([])

  useEffect(() => {
    if (!userId) return

    const subscription = subscribeToNotifications(userId, (payload) => {
      const { new: notification } = payload

      if (!notification) return

      const notificationRecord = notification as NotificationRecord
      setNewNotifications(prev => [notificationRecord, ...prev])

      // Show toast based on type
      const toastFn = {
        success: toast.success,
        error: toast.error,
        warning: toast,
        info: toast
      }[notificationRecord.type || 'info'] || toast

      toastFn(notificationRecord.title || 'Notification')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  return newNotifications
}

export function useRealtimeTimers(companyId: string) {
  const [activeTimers, setActiveTimers] = useState<TimerRecord[]>([])

  useEffect(() => {
    if (!companyId) return

    const subscription = subscribeToTimeLogs(companyId, (payload) => {
      const { eventType, new: newTimer, old: oldTimer } = payload

      if (eventType === 'INSERT' && newTimer) {
        const timer = newTimer as TimerRecord
        if (timer.status === 'running') {
          setActiveTimers(prev => [timer, ...prev])
          toast(`Timer started by ${timer.user_id || 'Unknown'}`)
        }
      } else if (eventType === 'UPDATE' && newTimer) {
        const timer = newTimer as TimerRecord
        setActiveTimers(prev => {
          if (timer.status === 'running') {
            return prev.map(t => t.id === timer.id ? timer : t)
          } else {
            return prev.filter(t => t.id !== timer.id)
          }
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [companyId])

  return activeTimers
}
