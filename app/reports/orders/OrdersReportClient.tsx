'use client';

import { useState } from 'react';
import { exportToCSV } from '@/lib/reports/export-utils';
import type { OrderReportData } from '@/lib/reports/orders-report';

interface OrdersSummary {
  total: number
  pending: number
  in_progress: number
  completed: number
  delayed: number
  cancelled: number
  total_revenue: number
}

interface Props {
  orders: OrderReportData[];
  summary: OrdersSummary;
}

export default function OrdersReportClient({ orders, summary }: Props) {
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const handleExport = () => {
    const exportData = filteredOrders.map((order) => ({
      'Numer zamówienia': order.order_number,
      'Klient': order.customer_name,
      'Część': order.part_name || '-',
      'Ilość': order.quantity,
      'Status': order.status,
      'Deadline': new Date(order.deadline).toLocaleDateString('pl-PL'),
      'Utworzono': new Date(order.created_at).toLocaleDateString('pl-PL'),
      'Wartość': order.total_cost || 0,
      'Operator': order.creator_name || 'Unknown',
    }));

    exportToCSV(exportData, `zamowienia_${new Date().toISOString().split('T')[0]}`);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Oczekujące',
      in_progress: 'W realizacji',
      completed: 'Ukończone',
      delayed: 'Opóźnione',
      cancelled: 'Anulowane',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-600',
      in_progress: 'bg-blue-600',
      completed: 'bg-green-600',
      delayed: 'bg-red-600',
      cancelled: 'bg-gray-600',
    };
    return colors[status] || 'bg-slate-600';
  };

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Wszystkie</p>
            <p className="text-2xl font-bold text-white">{summary.total}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Oczekujące</p>
            <p className="text-2xl font-bold text-yellow-400">{summary.pending}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">W realizacji</p>
            <p className="text-2xl font-bold text-blue-400">{summary.in_progress}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Ukończone</p>
            <p className="text-2xl font-bold text-green-400">{summary.completed}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Opóźnione</p>
            <p className="text-2xl font-bold text-red-400">{summary.delayed}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-slate-400 text-xs mb-1">Przychód</p>
            <p className="text-2xl font-bold text-purple-400">
              {summary.total_revenue.toFixed(0)} PLN
            </p>
          </div>
        </div>
      )}

      {/* Filters & Export */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status Filter */}
          <div>
            <label className="text-slate-400 text-sm mr-2">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Wszystkie</option>
              <option value="pending">Oczekujące</option>
              <option value="in_progress">W realizacji</option>
              <option value="completed">Ukończone</option>
              <option value="delayed">Opóźnione</option>
              <option value="cancelled">Anulowane</option>
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

      {/* Orders Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Numer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Klient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Część
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Ilość
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Deadline
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  Wartość
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-700/50 transition">
                  <td className="px-4 py-3 text-white font-mono text-sm">
                    {order.order_number}
                  </td>
                  <td className="px-4 py-3 text-white">{order.customer_name}</td>
                  <td className="px-4 py-3 text-slate-300">{order.part_name || '-'}</td>
                  <td className="px-4 py-3 text-white">{order.quantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold text-white ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(order.deadline).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    {order.total_cost ? `${order.total_cost} PLN` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400">Brak zamówień spełniających kryteria filtrowania</p>
          </div>
        )}

        {/* Count */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-700">
          <p className="text-slate-400 text-sm">
            Wyświetlono <span className="text-white font-semibold">{filteredOrders.length}</span> zamówień
          </p>
        </div>
      </div>
    </div>
  );
}
