'use client'

import { useState, useMemo } from 'react'
import DateRangeFilter from '@/components/ui/DateRangeFilter'

interface AuditLog {
  id: string
  user_id: number
  company_id: string
  action: string
  entity_type: string
  entity_id: string | null
  changes: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

interface AuditLogsClientProps {
  logs: AuditLog[]
}

export default function AuditLogsClient({ logs }: AuditLogsClientProps) {
  const [actionFilter, setActionFilter] = useState('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [searchQuery, setSearchQuery] = useState('')

  // Get unique values for filters
  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.action))).sort()
  }, [logs])

  const uniqueEntityTypes = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.entity_type))).sort()
  }, [logs])

  const uniqueUsers = useMemo(() => {
    const users = logs
      .map(log => log.user)
      .filter((user, index, self) =>
        user && self.findIndex(u => u?.email === user?.email) === index
      )
    return users
  }, [logs])

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = logs

    // Action filter
    if (actionFilter !== 'all') {
      result = result.filter(log => log.action === actionFilter)
    }

    // Entity type filter
    if (entityTypeFilter !== 'all') {
      result = result.filter(log => log.entity_type === entityTypeFilter)
    }

    // User filter
    if (userFilter !== 'all') {
      result = result.filter(log => log.user?.email === userFilter)
    }

    // Date range filter
    if (dateRange.start) {
      result = result.filter(log => {
        const logDate = new Date(log.created_at).toISOString().split('T')[0]
        return logDate >= dateRange.start
      })
    }
    if (dateRange.end) {
      result = result.filter(log => {
        const logDate = new Date(log.created_at).toISOString().split('T')[0]
        return logDate <= dateRange.end
      })
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(log =>
        log.action.toLowerCase().includes(query) ||
        log.entity_type.toLowerCase().includes(query) ||
        (log.entity_id && log.entity_id.toLowerCase().includes(query)) ||
        log.user?.full_name.toLowerCase().includes(query) ||
        log.user?.email.toLowerCase().includes(query)
      )
    }

    return result
  }, [logs, actionFilter, entityTypeFilter, userFilter, dateRange, searchQuery])

  // Action color mapping
  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) return 'text-green-400'
    if (action.includes('update') || action.includes('edit')) return 'text-blue-400'
    if (action.includes('delete') || action.includes('remove')) return 'text-red-400'
    if (action.includes('login') || action.includes('logout')) return 'text-yellow-400'
    return 'text-slate-400'
  }

  return (
    <div className="grid grid-cols-[300px_1fr] gap-6">
      {/* LEFT COLUMN - Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <label className="text-sm font-semibold text-slate-300 mb-2 block">Szukaj</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj w logach..."
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Date Range Filter */}
        <DateRangeFilter
          onFilterChange={(start, end) => setDateRange({ start, end })}
          label="Zakres dat"
        />

        {/* Action Filter */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <label className="text-sm font-semibold text-slate-300 mb-2 block">Akcja</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Wszystkie</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        {/* Entity Type Filter */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <label className="text-sm font-semibold text-slate-300 mb-2 block">Typ encji</label>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Wszystkie</option>
            {uniqueEntityTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* User Filter */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <label className="text-sm font-semibold text-slate-300 mb-2 block">Użytkownik</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Wszyscy</option>
            {uniqueUsers.map(user => user && (
              <option key={user.email} value={user.email}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400">Wyniki</p>
          <p className="text-2xl font-bold text-white">{filteredLogs.length}</p>
          <p className="text-xs text-slate-500">z {logs.length} logów</p>
        </div>
      </div>

      {/* RIGHT COLUMN - Logs Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Użytkownik
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Akcja
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  ID Encji
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Brak logów spełniających kryteria
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const userName = log.user?.full_name || 'Unknown User'
                  const userEmail = log.user?.email || ''

                  return (
                    <tr key={log.id} className="hover:bg-slate-700/50 transition">
                      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('pl-PL', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-white font-medium">{userName}</div>
                        <div className="text-xs text-slate-500">{userEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {log.entity_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 font-mono text-xs">
                        {log.entity_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 font-mono text-xs">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
