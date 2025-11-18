'use client';

import { useState } from 'react';
import { exportToCSV } from '@/lib/reports/export-utils';
import type { TimeReportData } from '@/lib/reports/time-report';

interface Props {
  logs: TimeReportData[];
  summary: any;
  users: Array<{ id: number; name: string }>;
}

export default function TimeReportClient({ logs, summary, users }: Props) {
  const [userFilter, setUserFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Apply filters
  let filteredLogs = logs;

  if (userFilter !== 'all') {
    filteredLogs = filteredLogs.filter((l) => l.user_id === parseInt(userFilter));
  }

  if (statusFilter !== 'all') {
    filteredLogs = filteredLogs.filter((l) => l.status === statusFilter);
  }

  const handleExport = () => {
    const exportData = filteredLogs.map((log) => ({
      'Numer zamówienia': log.order_number || '-',
      'Operator': log.user_name || 'Unknown',
      'Data rozpoczęcia': new Date(log.start_time).toLocaleString('pl-PL'),
      'Data zakończenia': log.end_time
        ? new Date(log.end_time).toLocaleString('pl-PL')
        : 'W trakcie',
      'Status': log.status === 'running' ? 'W trakcie' : log.status === 'completed' ? 'Zakończone' : log.status,
      'Czas (godz.)': log.duration_hours,
      'Stawka (PLN/h)': log.hourly_rate || 0,
      'Koszt (PLN)': log.total_cost,
    }));

    exportToCSV(exportData, `czas_pracy_${new Date().toISOString().split('T')[0]}`);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      running: 'W trakcie',
      paused: 'Wstrzymany',
      completed: 'Zakończony',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      running: 'bg-blue-600',
      paused: 'bg-yellow-600',
      completed: 'bg-green-600',
    };
    return colors[status] || 'bg-slate-600';
  };

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Wszystkie wpisy</p>
            <p className="text-2xl font-bold text-white">{summary.total_entries}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Aktywne timery</p>
            <p className="text-2xl font-bold text-blue-400">{summary.active_timers}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Zakończone</p>
            <p className="text-2xl font-bold text-green-400">{summary.completed_timers}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Łączny czas</p>
            <p className="text-2xl font-bold text-white">{summary.total_hours} h</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Łączny koszt</p>
            <p className="text-2xl font-bold text-purple-400">{summary.total_cost.toFixed(2)} PLN</p>
          </div>
        </div>
      )}

      {/* Filters & Export */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* User Filter */}
          <div>
            <label className="text-slate-400 text-sm mr-2">Operator:</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Wszyscy</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-slate-400 text-sm mr-2">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Wszystkie</option>
              <option value="running">W trakcie</option>
              <option value="paused">Wstrzymane</option>
              <option value="completed">Zakończone</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Time Logs Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Zamówienie
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Operator
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Rozpoczęcie
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Zakończenie
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Czas
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Koszt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/50 transition">
                  <td className="px-4 py-3 text-white font-mono text-sm">
                    {log.order_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-white">{log.user_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(log.start_time).toLocaleString('pl-PL', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {log.end_time
                      ? new Date(log.end_time).toLocaleString('pl-PL', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold text-white ${getStatusColor(
                        log.status
                      )}`}
                    >
                      {getStatusLabel(log.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    {log.duration_hours} h
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    {log.total_cost.toFixed(2)} PLN
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400">Brak wpisów spełniających kryteria filtrowania</p>
          </div>
        )}

        {/* Count */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-700">
          <p className="text-slate-400 text-sm">
            Wyświetlono <span className="text-white font-semibold">{filteredLogs.length}</span> wpisów
          </p>
        </div>
      </div>
    </div>
  );
}
