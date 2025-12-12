import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAutosave } from '@/hooks/useAutosave'

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call onSave after debounce period', async () => {
    const onSave = vi.fn()
    const data = { name: 'Test' }

    const { rerender } = renderHook(
      ({ data }) => useAutosave({ data, onSave, debounce: 2000, interval: 30000 }),
      { initialProps: { data } }
    )

    // Change data
    const newData = { name: 'Test Updated' }
    rerender({ data: newData })

    // Fast-forward 2 seconds (debounce)
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(newData)
    })
  })

  it('should save to localStorage when storageKey provided', async () => {
    const onSave = vi.fn()
    const data = { name: 'Test' }

    renderHook(() =>
      useAutosave({
        data,
        onSave,
        storageKey: 'test-key',
        debounce: 2000,
      })
    )

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      const stored = localStorage.getItem('test-key')
      expect(stored).toBe(JSON.stringify(data))
    })
  })

  it('should auto-save at interval', async () => {
    const onSave = vi.fn()
    const data = { name: 'Test' }

    renderHook(() =>
      useAutosave({
        data,
        onSave,
        interval: 30000,
        debounce: 2000,
      })
    )

    // Fast-forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
  })

  it('should set hasUnsavedChanges to true when data changes', () => {
    const onSave = vi.fn()
    const { result, rerender } = renderHook(
      ({ data }) => useAutosave({ data, onSave, debounce: 2000 }),
      { initialProps: { data: { name: 'Test' } } }
    )

    expect(result.current.hasUnsavedChanges).toBe(false)

    // Change data
    rerender({ data: { name: 'Updated' } })

    expect(result.current.hasUnsavedChanges).toBe(true)
  })

  it('should allow manual save with saveNow', async () => {
    const onSave = vi.fn()
    const data = { name: 'Test' }

    const { result } = renderHook(() =>
      useAutosave({ data, onSave, debounce: 2000 })
    )

    await act(async () => {
      await result.current.saveNow()
    })

    expect(onSave).toHaveBeenCalledWith(data)
  })

  it('should clear autosave data from localStorage', () => {
    const onSave = vi.fn()
    const data = { name: 'Test' }

    const { result } = renderHook(() =>
      useAutosave({
        data,
        onSave,
        storageKey: 'test-key',
        debounce: 2000,
      })
    )

    // Save to localStorage
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Clear
    act(() => {
      result.current.clearAutosave()
    })

    expect(localStorage.getItem('test-key')).toBeNull()
  })

  it('should warn before unload when hasUnsavedChanges', () => {
    const onSave = vi.fn()
    const { rerender } = renderHook(
      ({ data }) => useAutosave({ data, onSave, debounce: 2000 }),
      { initialProps: { data: { name: 'Test' } } }
    )

    const beforeUnloadHandler = vi.fn((e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    })

    window.addEventListener('beforeunload', beforeUnloadHandler)

    // Change data (unsaved changes)
    rerender({ data: { name: 'Updated' } })

    const event = new Event('beforeunload') as BeforeUnloadEvent
    window.dispatchEvent(event)

    // Should have been called (has unsaved changes)
    expect(beforeUnloadHandler).toHaveBeenCalled()
  })
})
