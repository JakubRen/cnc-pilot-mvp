'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { useLiveRegion } from '@/components/ui/LiveRegion'

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  quantity: number
  unit: string
  low_stock_threshold?: number
  location?: string
  batch_number?: string
  notes?: string
}

export function useOptimisticInventory(initialItems: InventoryItem[]) {
  const router = useRouter()
  const { announce } = useLiveRegion()
  const [items, setItems] = useState(initialItems)
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())

  // Sync with server data when initialItems change
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  /**
   * Optimistically update item quantity
   */
  const updateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    const originalItem = items.find(i => i.id === itemId)
    if (!originalItem) return

    // 1. Optimistically update UI
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ))
    setPendingUpdates(prev => new Set(prev).add(itemId))

    try {
      // 2. Make API call
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', itemId)

      if (error) throw error

      toast.success('Ilość zaktualizowana')
      announce('Ilość w magazynie zaktualizowana')
      router.refresh()
    } catch (error) {
      // 3. Rollback on error
      setItems(prev => prev.map(item =>
        item.id === itemId ? originalItem : item
      ))
      toast.error('Nie udało się zaktualizować ilości')
      logger.error('Optimistic quantity update failed', { error, itemId, newQuantity })
    } finally {
      setPendingUpdates(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }, [items, router, announce])

  /**
   * Optimistically adjust quantity (add/subtract)
   */
  const adjustQuantity = useCallback(async (itemId: string, adjustment: number) => {
    const originalItem = items.find(i => i.id === itemId)
    if (!originalItem) return

    const newQuantity = Math.max(0, originalItem.quantity + adjustment)

    // 1. Optimistically update UI
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ))
    setPendingUpdates(prev => new Set(prev).add(itemId))

    try {
      // 2. Make API call
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', itemId)

      if (error) throw error

      const action = adjustment > 0 ? 'dodano' : 'odjęto'
      toast.success(`${action} ${Math.abs(adjustment)} ${originalItem.unit}`)
      announce(`Zaktualizowano ilość: ${action} ${Math.abs(adjustment)}`)
      router.refresh()
    } catch (error) {
      // 3. Rollback
      setItems(prev => prev.map(item =>
        item.id === itemId ? originalItem : item
      ))
      toast.error('Nie udało się zmienić ilości')
      logger.error('Optimistic adjust failed', { error, itemId, adjustment })
    } finally {
      setPendingUpdates(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }, [items, router, announce])

  /**
   * Optimistically delete item
   */
  const deleteItem = useCallback(async (itemId: string) => {
    const itemToDelete = items.find(i => i.id === itemId)
    if (!itemToDelete) return

    // 1. Optimistically remove
    setItems(prev => prev.filter(item => item.id !== itemId))
    setPendingUpdates(prev => new Set(prev).add(itemId))

    try {
      // 2. Make API call
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      toast.success(`Usunięto: ${itemToDelete.name}`)
      announce(`Usunięto pozycję ${itemToDelete.name}`)
      router.refresh()
    } catch (error) {
      // 3. Rollback
      setItems(prev => [...prev, itemToDelete].sort((a, b) => a.name.localeCompare(b.name)))
      toast.error('Nie udało się usunąć pozycji')
      logger.error('Optimistic delete failed', { error, itemId })
    } finally {
      setPendingUpdates(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }, [items, router, announce])

  /**
   * Optimistically update item details
   */
  const updateItem = useCallback(async (itemId: string, updates: Partial<InventoryItem>) => {
    const originalItem = items.find(i => i.id === itemId)
    if (!originalItem) return

    // 1. Optimistically update UI
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    ))
    setPendingUpdates(prev => new Set(prev).add(itemId))

    try {
      // 2. Make API call
      const { error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', itemId)

      if (error) throw error

      toast.success('Zapisano zmiany')
      announce('Pozycja magazynowa zaktualizowana')
      router.refresh()
    } catch (error) {
      // 3. Rollback
      setItems(prev => prev.map(item =>
        item.id === itemId ? originalItem : item
      ))
      toast.error('Nie udało się zapisać zmian')
      logger.error('Optimistic update failed', { error, itemId, updates })
    } finally {
      setPendingUpdates(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }, [items, router, announce])

  return {
    items,
    updateQuantity,
    adjustQuantity,
    deleteItem,
    updateItem,
    isPending: (itemId: string) => pendingUpdates.has(itemId),
    hasPendingUpdates: pendingUpdates.size > 0
  }
}
