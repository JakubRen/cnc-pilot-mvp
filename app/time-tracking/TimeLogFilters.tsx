// ============================================
// app/time-tracking/TimeLogFilters.tsx
// Filter controls for time logs
// ============================================

'use client';

import { useTranslation } from '@/hooks/useTranslation';

interface Order {
  id: string;
  order_number: string;
}

interface User {
  id: number;
  full_name: string;
}

interface Props {
  orders: Order[];
  users: User[];
  selectedOrderId: string;
  selectedUserId: string;
  selectedStatus: string;
  dateRange: string;
  onOrderChange: (value: string) => void;
  onUserChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
}

export default function TimeLogFilters({
  orders,
  users,
  selectedOrderId,
  selectedUserId,
  selectedStatus,
  dateRange,
  onOrderChange,
  onUserChange,
  onStatusChange,
  onDateRangeChange
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="font-semibold mb-4">{t('timeTracking', 'filters')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Order Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">{t('timeTracking', 'order')}</label>
          <select
            value={selectedOrderId}
            onChange={(e) => onOrderChange(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('timeTracking', 'allOrders')}</option>
            {orders.map(order => (
              <option key={order.id} value={order.id}>
                {order.order_number}
              </option>
            ))}
          </select>
        </div>

        {/* User Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">{t('timeTracking', 'operator')}</label>
          <select
            value={selectedUserId}
            onChange={(e) => onUserChange(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('timeTracking', 'allOperators')}</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">{t('common', 'status')}</label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('timeTracking', 'allStatus')}</option>
            <option value="running">{t('timeTracking', 'running')}</option>
            <option value="paused">{t('timeTracking', 'paused')}</option>
            <option value="completed">{t('timeTracking', 'completedStatus')}</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">{t('timeTracking', 'dateRange')}</label>
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('timeTracking', 'allTime')}</option>
            <option value="today">{t('orderFilters', 'today')}</option>
            <option value="week">{t('orderFilters', 'thisWeek')}</option>
            <option value="month">{t('orderFilters', 'thisMonth')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
