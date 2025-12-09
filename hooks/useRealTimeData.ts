import { useEffect, useState, useRef } from 'react'

interface UseRealTimeDataOptions<T> {
  fetcher: () => Promise<T>
  interval?: number // milliseconds
  enabled?: boolean
  onError?: (error: Error) => void
}

export function useRealTimeData<T>({
  fetcher,
  interval = 5000,
  enabled = true,
  onError,
}: UseRealTimeDataOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  const fetchData = async () => {
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
    } catch (err) {
      const error = err as Error
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) return

    fetchData()

    intervalRef.current = setInterval(fetchData, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, interval])

  const refetch = () => {
    setIsLoading(true)
    fetchData()
  }

  return { data, isLoading, error, refetch }
}
