'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

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
          console.log('[useInventoryItems] No user found')
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
          console.error('[useInventoryItems] Profile error:', profileError)
          setItems([])
          setLoading(false)
          return
        }

        if (!userProfile?.company_id) {
          console.log('[useInventoryItems] No company_id')
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
          console.error('[useInventoryItems] Query error:', queryError)
          throw queryError
        }

        console.log(`[useInventoryItems] Found ${data?.length || 0} items for filter: ${filterKey}`)
        setItems(data || [])
      } catch (err) {
        console.error('[useInventoryItems] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load inventory')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [filterKey, categoryFilter])

  return { items, loading, error }
}

// Pre-configured hooks for common use cases
export function useMaterials() {
  return useInventoryItems('raw_material')
}

export function useParts() {
  return useInventoryItems(['part', 'finished_good'])
}
