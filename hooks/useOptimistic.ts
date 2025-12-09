import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface OptimisticOptions<T> {
  onMutate?: (newData: T) => void
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  rollbackOnError?: boolean
}

export function useOptimisticUpdate<T>(
  initialData: T,
  options: OptimisticOptions<T> = {}
) {
  const [data, setData] = useState<T>(initialData)
  const [previousData, setPreviousData] = useState<T>(initialData)
  const [isUpdating, setIsUpdating] = useState(false)

  const mutate = useCallback(
    async (
      updateFn: (currentData: T) => Promise<T>,
      optimisticData?: T
    ) => {
      setIsUpdating(true)
      setPreviousData(data)

      // Apply optimistic update immediately
      if (optimisticData) {
        setData(optimisticData)
        options.onMutate?.(optimisticData)
      }

      try {
        const result = await updateFn(data)
        setData(result)
        options.onSuccess?.(result)
        setIsUpdating(false)
        return result
      } catch (error) {
        const err = error as Error

        // Rollback on error
        if (options.rollbackOnError !== false) {
          setData(previousData)
          toast.error('Wystąpił błąd. Przywrócono poprzedni stan.')
        }

        options.onError?.(err)
        setIsUpdating(false)
        throw error
      }
    },
    [data, previousData, options]
  )

  return { data, mutate, isUpdating }
}
