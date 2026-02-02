'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useUserProfile } from '@/hooks/useUserProfile'

export interface InventoryItem {
  id: string
  name: string
  sku: string
  category: 'raw_material' | 'part' | 'tool' | 'consumable' | 'finished_good' | 'semi_finished'
  quantity: number
  unit: string
}

type CategoryFilter = 'raw_material' | 'part' | 'finished_good' | 'semi_finished' | 'all'

export function useInventoryItems(categoryFilter: CategoryFilter | CategoryFilter[]) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useUserProfile()

  // Stabilize the filter for useEffect dependency
  const categoryFilterString = Array.isArray(categoryFilter)
    ? categoryFilter.slice().sort().join(',')
    : categoryFilter

  const filterKey = useMemo(
    () => categoryFilterString,
    [categoryFilterString]
  )

  useEffect(() => {
    if (!profile?.company_id) {
      setItems([])
      setLoading(false)
      return
    }

    async function fetchItems() {
      try {
        setLoading(true)
        setError(null)

        // Query inventory table (this is where PW documents add stock)
        let query = supabase
          .from('inventory')
          .select('id, name, sku, category, quantity, unit')
          .eq('company_id', profile!.company_id!)
          .gt('quantity', 0) // Only items with stock
          .order('name')

        // Apply category filter
        if (categoryFilter !== 'all') {
          if (Array.isArray(categoryFilter)) {
            query = query.in('category', categoryFilter)
          } else {
            query = query.eq('category', categoryFilter)
          }
        }

        const { data, error: queryError } = await query

        if (queryError) {
          logger.error('[useInventoryItems] Query error', { error: queryError })
          throw queryError
        }

        logger.debug(`[useInventoryItems] Found ${data?.length || 0} items with stock for filter: ${filterKey}`)
        setItems(data || [])
      } catch (err) {
        logger.error('[useInventoryItems] Error', { error: err })
        setError(err instanceof Error ? err.message : 'Failed to load products')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [filterKey, profile?.company_id])

  return { items, loading, error }
}

// Pre-configured hooks for common use cases
export function useMaterials() {
  return useInventoryItems('raw_material')
}

export function useParts() {
  return useInventoryItems(['part', 'finished_good'])
}
