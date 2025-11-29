import { useState, useCallback } from 'react'

export const useOrderSelection = (allOrderIds: string[]) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())

  const handleToggleSelect = useCallback((orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedOrders(new Set(allOrderIds))
  }, [allOrderIds])

  const handleDeselectAll = useCallback(() => {
    setSelectedOrders(new Set())
  }, [])

  return {
    selectedOrders,
    setSelectedOrders,
    handleToggleSelect,
    handleSelectAll,
    handleDeselectAll
  }
}
