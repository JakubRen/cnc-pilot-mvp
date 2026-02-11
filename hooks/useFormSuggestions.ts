import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import type { FormSuggestionsData, MaterialSuggestion, QuantitySuggestion, PriceSanityResult } from '@/types/ai-expansion'

// Debounce helper (same pattern as useSmartPricing)
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

export function useFormSuggestions(
  partName: string,
  material: string,
  price: number | null
) {
  const [materials, setMaterials] = useState<MaterialSuggestion[]>([])
  const [quantities, setQuantities] = useState<QuantitySuggestion[]>([])
  const [priceSanity, setPriceSanity] = useState<PriceSanityResult | null>(null)
  const [loading, setLoading] = useState(false)

  const debouncedPartName = useDebounce(partName, 500)
  const debouncedMaterial = useDebounce(material, 500)
  const debouncedPrice = useDebounce(price, 500)

  const fetchSuggestions = useCallback(async () => {
    if (!debouncedPartName && !debouncedMaterial) {
      setMaterials([])
      setQuantities([])
      setPriceSanity(null)
      return
    }

    setLoading(true)
    try {
      // Dynamic import to avoid bundling server code in client
      const { getFormSuggestions } = await import('@/lib/ai/form-suggestions')
      const result: FormSuggestionsData = await getFormSuggestions({
        partName: debouncedPartName,
        material: debouncedMaterial,
        price: debouncedPrice,
      })

      setMaterials(result.materials)
      setQuantities(result.quantities)
      setPriceSanity(result.priceSanity)
    } catch (error) {
      logger.error('Failed to fetch form suggestions', { error })
    } finally {
      setLoading(false)
    }
  }, [debouncedPartName, debouncedMaterial, debouncedPrice])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  return { materials, quantities, priceSanity, isLoading: loading }
}
