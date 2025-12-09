import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRealTimeData } from '@/hooks/useRealTimeData'

describe('useRealTimeData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch data on mount', async () => {
    const fetcher = vi.fn().mockResolvedValue({ count: 10 })

    const { result } = renderHook(() =>
      useRealTimeData({
        fetcher,
        interval: 5000,
      })
    )

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled()
      expect(result.current.data).toEqual({ count: 10 })
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should poll data at specified interval', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ count: 10 })
      .mockResolvedValueOnce({ count: 15 })
      .mockResolvedValueOnce({ count: 20 })

    const { result } = renderHook(() =>
      useRealTimeData({
        fetcher,
        interval: 5000,
      })
    )

    // Initial fetch
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(result.current.data).toEqual({ count: 10 })
    })

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(result.current.data).toEqual({ count: 15 })
    })

    // Fast-forward another 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(3)
      expect(result.current.data).toEqual({ count: 20 })
    })
  })

  it('should handle errors', async () => {
    const error = new Error('Fetch failed')
    const fetcher = vi.fn().mockRejectedValue(error)
    const onError = vi.fn()

    const { result } = renderHook(() =>
      useRealTimeData({
        fetcher,
        interval: 5000,
        onError,
      })
    )

    await waitFor(() => {
      expect(result.current.error).toEqual(error)
      expect(result.current.isLoading).toBe(false)
      expect(onError).toHaveBeenCalledWith(error)
    })
  })

  it('should not fetch when enabled is false', async () => {
    const fetcher = vi.fn().mockResolvedValue({ count: 10 })

    renderHook(() =>
      useRealTimeData({
        fetcher,
        interval: 5000,
        enabled: false,
      })
    )

    // Wait a bit
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(fetcher).not.toHaveBeenCalled()
  })

  it('should allow manual refetch', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ count: 10 })
      .mockResolvedValueOnce({ count: 25 })

    const { result } = renderHook(() =>
      useRealTimeData({
        fetcher,
        interval: 50000, // Long interval
      })
    )

    // Initial fetch
    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 10 })
    })

    // Manual refetch
    await act(async () => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(result.current.data).toEqual({ count: 25 })
    })
  })

  it('should clear interval on unmount', async () => {
    const fetcher = vi.fn().mockResolvedValue({ count: 10 })

    const { unmount } = renderHook(() =>
      useRealTimeData({
        fetcher,
        interval: 5000,
      })
    )

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1)
    })

    unmount()

    // Advance time - should not call fetcher again
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(fetcher).toHaveBeenCalledTimes(1) // Still only 1
  })

  it('should set loading state during refetch', async () => {
    const fetcher = vi.fn()
      .mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ count: 10 }), 100)
      ))

    const { result } = renderHook(() =>
      useRealTimeData({
        fetcher,
        interval: 5000,
      })
    )

    expect(result.current.isLoading).toBe(true)

    act(() => {
      result.current.refetch()
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})
