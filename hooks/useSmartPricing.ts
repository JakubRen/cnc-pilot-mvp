import { useState, useEffect, useCallback } from 'react'
import { getSmartPricing, getSimilarOrdersList, PricingEstimate, SimilarOrder } from '@/lib/pricing-engine'

// Debounce helper
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

export function useSmartPricing(partName: string, material: string) {
  const [estimate, setEstimate] = useState<PricingEstimate | null>(null)
  const [similarOrders, setSimilarOrders] = useState<SimilarOrder[]>([])
  const [loading, setLoading] = useState(false)

  const debouncedPartName = useDebounce(partName, 500) // 500ms delay
  const debouncedMaterial = useDebounce(material, 500)

  const fetchInsights = useCallback(async () => {
    if (!debouncedPartName && !debouncedMaterial) {
      setEstimate(null)
      setSimilarOrders([])
      return
    }

    setLoading(true)
    try {
      // Run parallel queries
      const [est, similar] = await Promise.all([
        getSmartPricing(debouncedPartName, debouncedMaterial),
        getSimilarOrdersList(debouncedPartName, debouncedMaterial)
      ])

      setEstimate(est)
      setSimilarOrders(similar)
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }, [debouncedPartName, debouncedMaterial])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  return { estimate, similarOrders, loading }
}
