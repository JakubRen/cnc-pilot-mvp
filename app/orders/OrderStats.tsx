'use client'

import { FilterState } from './OrderFilters'

interface OrderStatsProps {
  orders: any[]
  onFilterClick: (filters: FilterState) => void
}

export default function OrderStats({ orders, onFilterClick }: OrderStatsProps) {
  // Calculate statistics
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
    delayed: orders.filter(o => o.status === 'delayed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    urgent: orders.filter(o => {
      const deadline = new Date(o.deadline)
      const today = new Date()
      const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilDeadline <= 3 && daysUntilDeadline >= 0 && o.status !== 'completed' && o.status !== 'cancelled'
    }).length,
    overdue: orders.filter(o => {
      const deadlineDate = new Date(o.deadline)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return deadlineDate <= today && o.status !== 'completed' && o.status !== 'cancelled'
    }).length,
  }

  return (
    <div className="space-y-3">
      {/* Total Orders - Click to clear filters */}
      <div
        onClick={() => onFilterClick({ status: 'all', deadline: 'all', search: '' })}
        className="bg-slate-800 p-4 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-700 transition"
      >
        <p className="text-slate-400 text-xs mb-1">Total Orders</p>
        <p className="text-2xl font-bold text-white">{stats.total}</p>
      </div>

      {/* In Progress - Click to filter */}
      <div
        onClick={() => onFilterClick({ status: 'in_progress', deadline: 'all', search: '' })}
        className="bg-slate-800 p-4 rounded-lg border border-blue-700 cursor-pointer hover:bg-slate-700 transition"
      >
        <p className="text-slate-400 text-xs mb-1">In Progress</p>
        <p className="text-2xl font-bold text-blue-400">{stats.in_progress}</p>
      </div>

      {/* Urgent - Click to filter */}
      <div
        onClick={() => onFilterClick({ status: 'all', deadline: 'urgent', search: '' })}
        className="bg-slate-800 p-4 rounded-lg border border-yellow-700 cursor-pointer hover:bg-slate-700 transition"
      >
        <p className="text-slate-400 text-xs mb-1">Urgent</p>
        <p className="text-2xl font-bold text-yellow-400">{stats.urgent}</p>
        <p className="text-xs text-slate-500 mt-1">≤ 3 days</p>
      </div>

      {/* Overdue - Click to filter */}
      <div
        onClick={() => onFilterClick({ status: 'all', deadline: 'overdue', search: '' })}
        className="bg-slate-800 p-4 rounded-lg border border-red-700 cursor-pointer hover:bg-slate-700 transition"
      >
        <p className="text-slate-400 text-xs mb-1">Overdue</p>
        <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
      </div>

      {/* Status Breakdown */}
      <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
        <p className="text-slate-400 text-xs mb-3">Status Breakdown</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
              <span className="text-slate-300 text-xs">Pending</span>
            </div>
            <span className="text-white text-xs font-semibold">{stats.pending}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span className="text-slate-300 text-xs">In Progress</span>
            </div>
            <span className="text-white text-xs font-semibold">{stats.in_progress}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
              <span className="text-slate-300 text-xs">Completed</span>
            </div>
            <span className="text-white text-xs font-semibold">{stats.completed}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600"></div>
              <span className="text-slate-300 text-xs">Delayed</span>
            </div>
            <span className="text-white text-xs font-semibold">{stats.delayed}</span>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Progress</span>
              <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stats.completed / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
