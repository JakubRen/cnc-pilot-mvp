import { useMemo } from 'react'
import { FilterState } from '@/app/orders/OrderFilters'

export const useOrderFiltering = (orders: any[], filters: FilterState, selectedTagIds: string[], tagLogic: 'AND' | 'OR') => {
  const filteredOrders = useMemo(() => {
    let result = orders

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter(order => order.status === filters.status)
    }

    // Filter by deadline
    if (filters.deadline !== 'all') {
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      result = result.filter(order => {
        const deadline = new Date(order.deadline)
        deadline.setHours(0, 0, 0, 0)

        if (filters.deadline === 'urgent') {
          // Urgent: deadline within 3 days (including today), not completed/cancelled
          const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return daysUntilDeadline <= 3 && daysUntilDeadline >= 0 && order.status !== 'completed' && order.status !== 'cancelled'
        }
        if (filters.deadline === 'overdue') {
          return deadline < now && order.status !== 'completed' && order.status !== 'cancelled'
        }
        if (filters.deadline === 'today') {
          return deadline.getTime() === now.getTime()
        }
        if (filters.deadline === 'this_week') {
          const nextWeek = new Date(now)
          nextWeek.setDate(nextWeek.getDate() + 7)
          return deadline >= now && deadline < nextWeek
        }
        if (filters.deadline === 'this_month') {
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          endOfMonth.setHours(23, 59, 59, 999)
          return deadline >= now && deadline <= endOfMonth
        }
        if (filters.deadline === 'next_month') {
          const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          startNextMonth.setHours(0, 0, 0, 0)
          const endNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
          endNextMonth.setHours(23, 59, 59, 999)
          return deadline >= startNextMonth && deadline <= endNextMonth
        }

        return true
      })
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(order =>
        order.order_number.toLowerCase().includes(searchLower) ||
        order.customer_name.toLowerCase().includes(searchLower) ||
        (order.part_name && order.part_name.toLowerCase().includes(searchLower))
      )
    }

    // Tag filter
    if (selectedTagIds.length > 0) {
      result = result.filter(order => {
        const orderTagIds = (order.tags || []).map((tag: any) => tag.id)

        if (tagLogic === 'AND') {
          // Order must have ALL selected tags
          return selectedTagIds.every(tagId => orderTagIds.includes(tagId))
        } else {
          // Order must have AT LEAST ONE selected tag
          return selectedTagIds.some(tagId => orderTagIds.includes(tagId))
        }
      })
    }

    // Sort orders
    result = [...result].sort((a, b) => {
      switch (filters.sortBy) {
        case 'cost_desc':
          return (b.total_cost || 0) - (a.total_cost || 0)
        case 'cost_asc':
          return (a.total_cost || 0) - (b.total_cost || 0)
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'deadline':
        default:
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
    })

    return result
  }, [orders, filters, selectedTagIds, tagLogic])

  return filteredOrders
}
