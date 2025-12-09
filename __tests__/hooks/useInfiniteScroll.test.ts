import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)
})

describe('useInfiniteScroll', () => {
  it('should create IntersectionObserver on mount', () => {
    const onLoadMore = vi.fn()

    renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
        isLoading: false,
      })
    )

    expect(mockIntersectionObserver).toHaveBeenCalled()
  })

  it('should call onLoadMore when element intersects', () => {
    const onLoadMore = vi.fn()
    let intersectionCallback: IntersectionObserverCallback

    mockIntersectionObserver.mockImplementation((callback) => {
      intersectionCallback = callback
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }
    })

    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
        isLoading: false,
      })
    )

    // Simulate element becoming visible
    const mockEntry = {
      isIntersecting: true,
      target: result.current.loadMoreRef.current,
    } as IntersectionObserverEntry

    intersectionCallback!([mockEntry], {} as IntersectionObserver)

    expect(onLoadMore).toHaveBeenCalled()
  })

  it('should not call onLoadMore when hasMore is false', () => {
    const onLoadMore = vi.fn()
    let intersectionCallback: IntersectionObserverCallback

    mockIntersectionObserver.mockImplementation((callback) => {
      intersectionCallback = callback
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }
    })

    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: false, // No more data
        isLoading: false,
      })
    )

    const mockEntry = {
      isIntersecting: true,
      target: result.current.loadMoreRef.current,
    } as IntersectionObserverEntry

    intersectionCallback!([mockEntry], {} as IntersectionObserver)

    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('should not call onLoadMore when already loading', () => {
    const onLoadMore = vi.fn()
    let intersectionCallback: IntersectionObserverCallback

    mockIntersectionObserver.mockImplementation((callback) => {
      intersectionCallback = callback
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }
    })

    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
        isLoading: true, // Already loading
      })
    )

    const mockEntry = {
      isIntersecting: true,
      target: result.current.loadMoreRef.current,
    } as IntersectionObserverEntry

    intersectionCallback!([mockEntry], {} as IntersectionObserver)

    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('should use custom threshold', () => {
    const onLoadMore = vi.fn()

    renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
        isLoading: false,
        threshold: 300,
      })
    )

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        rootMargin: '300px',
      })
    )
  })

  it('should disconnect observer on unmount', () => {
    const disconnect = vi.fn()
    mockIntersectionObserver.mockReturnValue({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect,
    })

    const { unmount } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore: vi.fn(),
        hasMore: true,
        isLoading: false,
      })
    )

    unmount()

    expect(disconnect).toHaveBeenCalled()
  })
})
