'use client'

import { useEffect, useState } from 'react'
import { subscribeToOrders, subscribeToNotifications, subscribeToTimeLogs } from './client'
import toast from 'react-hot-toast'

export function useRealtimeOrders(companyId: string) {
  const [updates, setUpdates] = useState<any[]>([])

  useEffect(() => {
    if (!companyId) return

    const subscription = subscribeToOrders(companyId, (payload) => {
      const { eventType, new: newOrder, old: oldOrder } = payload

      setUpdates(prev => [...prev, payload])

      if (eventType === 'INSERT') {
        toast.success(`Nowe zamówienie: ${newOrder.order_number}`)
      } else if (eventType === 'UPDATE') {
        toast(`Zaktualizowano: ${newOrder.order_number}`)
      } else if (eventType === 'DELETE') {
        toast.error(`Usunięto: ${oldOrder.order_number}`)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [companyId])

  return updates
}

export function useRealtimeNotifications(userId: number) {
  const [newNotifications, setNewNotifications] = useState<any[]>([])

  useEffect(() => {
    if (!userId) return

    const subscription = subscribeToNotifications(userId, (payload) => {
      const { new: notification } = payload

      setNewNotifications(prev => [notification, ...prev])

      // Show toast based on type
      const toastFn = {
        success: toast.success,
        error: toast.error,
        warning: toast,
        info: toast
      }[notification.type as string] || toast

      toastFn(notification.title)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  return newNotifications
}

export function useRealtimeTimers(companyId: string) {
  const [activeTimers, setActiveTimers] = useState<any[]>([])

  useEffect(() => {
    if (!companyId) return

    const subscription = subscribeToTimeLogs(companyId, (payload) => {
      const { eventType, new: newTimer, old: oldTimer } = payload

      if (eventType === 'INSERT' && newTimer.status === 'running') {
        setActiveTimers(prev => [newTimer, ...prev])
        toast(`Timer started by ${newTimer.user_id}`)
      } else if (eventType === 'UPDATE') {
        setActiveTimers(prev => {
          if (newTimer.status === 'running') {
            return prev.map(t => t.id === newTimer.id ? newTimer : t)
          } else {
            return prev.filter(t => t.id !== newTimer.id)
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
