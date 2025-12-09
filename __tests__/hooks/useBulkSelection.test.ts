import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useBulkSelection } from '@/hooks/useBulkSelection'

describe('useBulkSelection', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
    { id: 4, name: 'Item 4' },
    { id: 5, name: 'Item 5' },
  ]

  it('should initialize with no selections', () => {
    const { result } = renderHook(() => useBulkSelection(mockItems))

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.selectedItems).toEqual([])
    expect(result.current.isAllSelected).toBe(false)
    expect(result.current.isSomeSelected).toBe(false)
  })

  it('should toggle item selection', () => {
    const { result } = renderHook(() => useBulkSelection(mockItems))

    act(() => {
      result.current.toggleItem(1)
    })

    expect(result.current.selectedCount).toBe(1)
    expect(result.current.isSelected(1)).toBe(true)
    expect(result.current.isSomeSelected).toBe(true)

    // Toggle off
    act(() => {
      result.current.toggleItem(1)
    })

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.isSelected(1)).toBe(false)
  })

  it('should select all items', () => {
    const { result } = renderHook(() => useBulkSelection(mockItems))

    act(() => {
      result.current.selectAll()
    })

    expect(result.current.selectedCount).toBe(5)
    expect(result.current.isAllSelected).toBe(true)
    expect(result.current.selectedItems).toEqual(mockItems)
  })

  it('should deselect all items', () => {
    const { result } = renderHook(() => useBulkSelection(mockItems))

    act(() => {
      result.current.selectAll()
    })

    expect(result.current.selectedCount).toBe(5)

    act(() => {
      result.current.deselectAll()
    })

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.isAllSelected).toBe(false)
  })

  it('should toggle all - select when none selected', () => {
    const { result } = renderHook(() => useBulkSelection(mockItems))

    act(() => {
      result.current.toggleAll()
    })

    expect(result.current.isAllSelected).toBe(true)
    expect(result.current.selectedCount).toBe(5)
  })

  it('should toggle all - deselect when all selected', () => {
    const { result } = renderHook(() => useBulkSelection(mockItems))

    act(() => {
      result.current.selectAll()
      result.current.toggleAll()
    })

    expect(result.current.isAllSelected).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it('should toggle all - select when some selected', () => {
    const { result } = renderHook(() => useBulkSelection(mockItems))

    act(() => {
      result.current.toggleItem(1)
      result.current.toggleItem(2)
    })

    expect(result.current.isSomeSelected).toBe(true)
    expect(result.current.isAllSelected).toBe(false)

    act(() => {
      result.current.toggleAll()
    })

    expect(result.current.isAllSelected).toBe(true)
    expect(result.current.selectedCount).toBe(5)
  })

  it('should check if item is selected', () => {
    const { result } = renderHook(() => useBulkSelection(mockItems))

    act(() => {
      result.current.toggleItem(1)
      result.current.toggleItem(3)
    })

    expect(result.current.isSelected(1)).toBe(true)
    expect(result.current.isSelected(2)).toBe(false)
    expect(result.current.isSelected(3)).toBe(true)
  })

  it('should return correct selectedItems array', () => {
    const { result } = renderHook(() => useBulkSelection(mockItems))

    act(() => {
      result.current.toggleItem(2)
      result.current.toggleItem(4)
    })

    expect(result.current.selectedItems).toEqual([
      { id: 2, name: 'Item 2' },
      { id: 4, name: 'Item 4' },
    ])
  })

  it('should handle string IDs', () => {
    const stringIdItems = [
      { id: 'a', name: 'Item A' },
      { id: 'b', name: 'Item B' },
    ]

    const { result } = renderHook(() => useBulkSelection(stringIdItems))

    act(() => {
      result.current.toggleItem('a')
    })

    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.selectedCount).toBe(1)
  })
})
