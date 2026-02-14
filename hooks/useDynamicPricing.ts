import { useState, useEffect, useCallback } from 'react'
import type { DynamicPricingResult } from '@/components/orders/SmartEstimateCard'

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

interface DynamicPricingInput {
  partName: string
  material: string
  quantity: number
  complexity: string
}

export function useDynamicPricing(input: DynamicPricingInput) {
  const [result, setResult] = useState<DynamicPricingResult | null>(null)
  const [loading, setLoading] = useState(false)

  const debouncedPartName = useDebounce(input.partName, 600)
  const debouncedMaterial = useDebounce(input.material, 600)

  const fetchPricing = useCallback(async () => {
    if (!debouncedPartName || debouncedPartName.trim().length < 2) {
      setResult(null)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/agents/dynamic-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partName: debouncedPartName,
          material: debouncedMaterial || undefined,
          quantity: input.quantity,
          complexity: input.complexity,
        }),
      })

      if (!res.ok) {
        setResult(null)
        return
      }

      const json = await res.json()
      if (json.success && json.data) {
        setResult(json.data)
      } else {
        setResult(null)
      }
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [debouncedPartName, debouncedMaterial, input.quantity, input.complexity])

  useEffect(() => {
    fetchPricing()
  }, [fetchPricing])

  return { dynamicPricing: result, dynamicPricingLoading: loading }
}
