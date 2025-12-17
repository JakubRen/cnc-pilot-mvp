'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export interface InventoryItem {
  id: string
  name: string
  sku: string
  category: 'raw_material' | 'part' | 'tool' | 'consumable' | 'finished_good'
  quantity: number
  unit: string
}

type CategoryFilter = 'raw_material' | 'part' | 'finished_good' | 'all'

export function useInventoryItems(categoryFilter: CategoryFilter | CategoryFilter[]) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stabilize the filter for useEffect dependency
  const categoryFilterString = Array.isArray(categoryFilter)
    ? categoryFilter.slice().sort().join(',')
    : categoryFilter

  const filterKey = useMemo(
    () => categoryFilterString,
    [categoryFilterString]
  )

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true)
        setError(null)

        // Get user's company_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          logger.debug('[useInventoryItems] No user found')
          setItems([])
          setLoading(false)
          return
        }

        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('company_id')
          .eq('auth_id', user.id)
          .single()

        if (profileError) {
          logger.error('[useInventoryItems] Profile error', { error: profileError })
          setItems([])
          setLoading(false)
          return
        }

        if (!userProfile?.company_id) {
          logger.debug('[useInventoryItems] No company_id')
          setItems([])
          setLoading(false)
          return
        }

        // Build query
        let query = supabase
          .from('inventory')
          .select('id, name, sku, category, quantity, unit')
          .eq('company_id', userProfile.company_id)
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

        logger.debug(`[useInventoryItems] Found ${data?.length || 0} items for filter: ${filterKey}`)
        setItems(data || [])
      } catch (err) {
        logger.error('[useInventoryItems] Error', { error: err })
        setError(err instanceof Error ? err.message : 'Failed to load inventory')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [filterKey])  // Only filterKey - it already includes categoryFilter changes

  return { items, loading, error }
}

// Pre-configured hooks for common use cases
export function useMaterials() {
  return useInventoryItems('raw_material')
}

export function useParts() {
  return useInventoryItems(['part', 'finished_good'])
}
