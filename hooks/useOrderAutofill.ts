import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

export interface AutofillMatch {
  id: string
  order_number: string
  part_name: string
  material: string | null
  quantity: number
  length: number | null
  width: number | null
  height: number | null
  complexity: 'simple' | 'medium' | 'complex' | null
  selling_price: number | null
  customer_name: string
  created_at: string
}

export interface AutofillFields {
  material: string
  quantity: number
  length: number | null
  width: number | null
  height: number | null
  complexity: 'simple' | 'medium' | 'complex'
}

// ============================================
// DEBOUNCE HELPER
// ============================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// ============================================
// HOOK
// ============================================

/**
 * useOrderAutofill — searches past orders by part name.
 * Debounced search (400ms). Returns matching orders for dropdown.
 * User selects a match → parent prefills fields.
 */
export function useOrderAutofill(partName: string) {
  const [matches, setMatches] = useState<AutofillMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const debouncedPartName = useDebounce(partName.trim(), 400)

  const search = useCallback(async () => {
    if (debouncedPartName.length < 2) {
      setMatches([])
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, part_name, material, quantity, length, width, height, complexity, selling_price, customer_name, created_at')
        .ilike('part_name', `%${debouncedPartName}%`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      setMatches(data || [])
      setIsOpen((data?.length ?? 0) > 0)
    } catch {
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [debouncedPartName])

  useEffect(() => {
    search()
  }, [search])

  /** Extract prefill fields from a selected match */
  const getAutofillFields = (match: AutofillMatch): AutofillFields => ({
    material: match.material || '',
    quantity: match.quantity || 1,
    length: match.length,
    width: match.width,
    height: match.height,
    complexity: match.complexity || 'medium',
  })

  /** Close dropdown */
  const close = () => setIsOpen(false)

  return {
    matches,
    loading,
    isOpen,
    close,
    getAutofillFields,
  }
}
