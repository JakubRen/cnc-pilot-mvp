// ============================================
// app/time-tracking/TimeLogsClient.tsx
// Client component for filtering and displaying time logs
// ============================================

'use client';

import { useState, useMemo } from 'react';
import TimeLogFilters from './TimeLogFilters';
import TimeLogList from './TimeLogList';
import TimeStats from '@/components/time-tracking/TimeStats';
import Link from 'next/link';

interface TimeLog {
  id: string;
  order_id: string;
  user_id: number;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  status: string;
  hourly_rate: number;
  total_cost: number;
  notes: string | null;
  orders: {
    id: string;
    order_number: string;
    estimated_hours: number | null;
  };
  users: {
    id: number;
    full_name: string;
  };
}

interface Order {
  id: string;
  order_number: string;
}

interface User {
  id: number;
  full_name: string;
}

interface Props {
  timeLogs: TimeLog[];
  orders: Order[];
  users: User[];
  currentUserId: number;
  currentUserRole: string;
}

export default function TimeLogsClient({
  timeLogs,
  orders,
  users,
  currentUserId,
  currentUserRole
}: Props) {
  // Filter states
  const [selectedOrderId, setSelectedOrderId] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all'); // all, today, week, month

  // Filter time logs
  const filteredTimeLogs = useMemo(() => {
    let filtered = timeLogs;

    // Order filter
    if (selectedOrderId !== 'all') {
      filtered = filtered.filter(log => log.order_id === selectedOrderId);
    }

    // User filter
    if (selectedUserId !== 'all') {
      filtered = filtered.filter(log => log.user_id === parseInt(selectedUserId));
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(log => log.status === selectedStatus);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(log => {
        const logDate = new Date(log.start_time);
        if (dateRange === 'today') {
          return logDate >= startOfToday;
        } else if (dateRange === 'week') {
          return logDate >= startOfWeek;
        } else if (dateRange === 'month') {
          return logDate >= startOfMonth;
        }
        return true;
      });
    }

    return filtered;
  }, [timeLogs, selectedOrderId, selectedUserId, selectedStatus, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedLogs = timeLogs.filter(log => log.status === 'completed');

    const todayLogs = completedLogs.filter(log => new Date(log.start_time) >= startOfToday);
    const weekLogs = completedLogs.filter(log => new Date(log.start_time) >= startOfWeek);
    const monthLogs = completedLogs.filter(log => new Date(log.start_time) >= startOfMonth);

    return {
      todayHours: todayLogs.reduce((sum, log) => sum + log.duration_seconds, 0) / 3600,
      weekHours: weekLogs.reduce((sum, log) => sum + log.duration_seconds, 0) / 3600,
      monthHours: monthLogs.reduce((sum, log) => sum + log.duration_seconds, 0) / 3600,
      monthCost: monthLogs.reduce((sum, log) => sum + log.total_cost, 0),
    };
  }, [timeLogs]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <TimeStats stats={stats} />

      {/* Add New Entry Button */}
      <div className="flex justify-end">
        <Link
          href="/time-tracking/add"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
        >
          + Add Manual Entry
        </Link>
      </div>

      {/* Filters */}
      <TimeLogFilters
        orders={orders}
        users={users}
        selectedOrderId={selectedOrderId}
        selectedUserId={selectedUserId}
        selectedStatus={selectedStatus}
        dateRange={dateRange}
        onOrderChange={setSelectedOrderId}
        onUserChange={setSelectedUserId}
        onStatusChange={setSelectedStatus}
        onDateRangeChange={setDateRange}
      />

      {/* Time Logs Table */}
      <TimeLogList
        timeLogs={filteredTimeLogs}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
