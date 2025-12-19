'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { useLiveRegion } from '@/components/ui/LiveRegion'

interface Order {
  id: string
  order_number: string
  customer_name: string
  quantity: number
  deadline: string
  status: string
  total_cost?: number | null
  part_name?: string | null
  created_at?: string
  material?: string | null
  notes?: string | null
  tags?: Array<{ id: string; name: string; color: string }>
  assigned_operator_name?: string | null
}

export function useOptimisticOrders(initialOrders: Order[]) {
  const router = useRouter()
  const { announce } = useLiveRegion()
  const [orders, setOrders] = useState(initialOrders)
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())

  // Sync with server data when initialOrders change
  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    // Store original order for rollback
    const originalOrder = orders.find(o => o.id === orderId)
    if (!originalOrder) return

    // 1. Optimistically update UI immediately
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    ))
    setPendingUpdates(prev => new Set(prev).add(orderId))

    try {
      // 2. Make actual API call
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      toast.success('Status zaktualizowany')
      announce('Status zamówienia zaktualizowany')

      // Refresh server data to ensure consistency
      router.refresh()
    } catch (error) {
      // 3. Rollback on error
      setOrders(prev => prev.map(order =>
        order.id === orderId ? originalOrder : order
      ))
      toast.error('Nie udało się zaktualizować statusu')
      logger.error('Optimistic update failed', { error, orderId, newStatus })
    } finally {
      setPendingUpdates(prev => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
    }
  }, [orders, router])

  const deleteOrder = useCallback(async (orderId: string, orderNumber: string) => {
    // Store for potential rollback
    const orderToDelete = orders.find(o => o.id === orderId)
    if (!orderToDelete) return

    // 1. Optimistically remove from UI
    setOrders(prev => prev.filter(order => order.id !== orderId))
    setPendingUpdates(prev => new Set(prev).add(orderId))

    try {
      // 2. Make actual API call
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) throw error

      toast.success(`Zamówienie #${orderNumber} usunięte`)
      announce(`Zamówienie numer ${orderNumber} zostało usunięte`)

      // Refresh server data
      router.refresh()
    } catch (error) {
      // 3. Rollback on error - restore deleted order
      setOrders(prev => {
        // Insert back in original position (sorted by created_at)
        const newOrders = [...prev, orderToDelete]
        return newOrders.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return dateB - dateA
        })
      })
      toast.error('Nie udało się usunąć zamówienia')
      logger.error('Optimistic delete failed', { error, orderId })
    } finally {
      setPendingUpdates(prev => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
    }
  }, [orders, router])

  const bulkUpdateStatus = useCallback(async (orderIds: string[], newStatus: string) => {
    // Store original orders for rollback
    const originalOrders = orders.filter(o => orderIds.includes(o.id))

    // 1. Optimistically update UI
    setOrders(prev => prev.map(order =>
      orderIds.includes(order.id) ? { ...order, status: newStatus } : order
    ))
    orderIds.forEach(id => setPendingUpdates(prev => new Set(prev).add(id)))

    try {
      // 2. Make actual API call
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .in('id', orderIds)

      if (error) throw error

      toast.success(`Pomyślnie zaktualizowano ${orderIds.length} zamówień`)
      announce(`Zaktualizowano ${orderIds.length} zamówień`)

      // Refresh server data
      router.refresh()
    } catch (error) {
      // 3. Rollback on error
      setOrders(prev => prev.map(order => {
        const original = originalOrders.find(o => o.id === order.id)
        return original || order
      }))
      toast.error('Nie udało się zaktualizować zamówień')
      logger.error('Bulk optimistic update failed', { error, orderIds, newStatus })
    } finally {
      orderIds.forEach(id => {
        setPendingUpdates(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
    }
  }, [orders, router])

  return {
    orders,
    updateOrderStatus,
    deleteOrder,
    bulkUpdateStatus,
    isPending: (orderId: string) => pendingUpdates.has(orderId),
    hasPendingUpdates: pendingUpdates.size > 0
  }
}
