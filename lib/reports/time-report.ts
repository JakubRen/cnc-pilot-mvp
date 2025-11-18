// Time Report queries and data processing

import { createClient } from '@/lib/supabase-server';

export interface TimeReportFilters {
  userId?: number;
  orderId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TimeReportData {
  id: string;
  order_id: string | null;
  order_number: string | null;
  user_id: number;
  user_name: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  hourly_rate: number | null;
  duration_hours: number;
  total_cost: number;
}

export async function getTimeReport(
  companyId: string,
  filters: TimeReportFilters = {}
): Promise<TimeReportData[]> {
  const supabase = await createClient();

  let query = supabase
    .from('time_logs')
    .select(`
      id,
      order_id,
      user_id,
      start_time,
      end_time,
      status,
      hourly_rate,
      order:orders(order_number),
      user:users!time_logs_user_id_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .order('start_time', { ascending: false });

  // Apply filters
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.orderId) {
    query = query.eq('order_id', filters.orderId);
  }

  if (filters.dateFrom) {
    query = query.gte('start_time', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('start_time', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching time report:', error);
    return [];
  }

  return (data || []).map((log) => {
    const startTime = new Date(log.start_time);
    const endTime = log.end_time ? new Date(log.end_time) : new Date();
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const totalCost = durationHours * (log.hourly_rate || 0);

    return {
      id: log.id,
      order_id: log.order_id,
      order_number: Array.isArray(log.order)
        ? (log.order[0] as any)?.order_number
        : (log.order as any)?.order_number,
      user_id: log.user_id,
      user_name: Array.isArray(log.user)
        ? (log.user[0] as any)?.full_name
        : (log.user as any)?.full_name,
      start_time: log.start_time,
      end_time: log.end_time,
      status: log.status,
      hourly_rate: log.hourly_rate,
      duration_hours: parseFloat(durationHours.toFixed(2)),
      total_cost: parseFloat(totalCost.toFixed(2)),
    };
  });
}

// Get time report summary statistics
export async function getTimeReportSummary(companyId: string) {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('time_logs')
    .select('start_time, end_time, status, hourly_rate')
    .eq('company_id', companyId);

  if (!logs) return null;

  let totalHours = 0;
  let totalCost = 0;

  logs.forEach((log) => {
    if (log.end_time) {
      const startTime = new Date(log.start_time);
      const endTime = new Date(log.end_time);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      totalHours += durationHours;
      totalCost += durationHours * (log.hourly_rate || 0);
    }
  });

  const summary = {
    total_entries: logs.length,
    total_hours: parseFloat(totalHours.toFixed(2)),
    total_cost: parseFloat(totalCost.toFixed(2)),
    active_timers: logs.filter((l) => l.status === 'running').length,
    completed_timers: logs.filter((l) => l.status === 'completed').length,
  };

  return summary;
}

// Get time entries grouped by user
export async function getTimeByUser(companyId: string) {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('time_logs')
    .select(`
      user_id,
      start_time,
      end_time,
      hourly_rate,
      user:users!time_logs_user_id_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .not('end_time', 'is', null);

  if (!logs) return [];

  // Group by user
  const userMap = logs.reduce((acc, log) => {
    const userName =
      Array.isArray(log.user)
        ? (log.user[0] as any)?.full_name
        : (log.user as any)?.full_name;

    if (!acc[userName]) {
      acc[userName] = { user: userName, hours: 0, cost: 0 };
    }

    const startTime = new Date(log.start_time);
    const endTime = new Date(log.end_time);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    acc[userName].hours += durationHours;
    acc[userName].cost += durationHours * (log.hourly_rate || 0);

    return acc;
  }, {} as Record<string, { user: string; hours: number; cost: number }>);

  return Object.values(userMap)
    .map((u) => ({
      user: u.user,
      hours: parseFloat(u.hours.toFixed(2)),
      cost: parseFloat(u.cost.toFixed(2)),
    }))
    .sort((a, b) => b.hours - a.hours);
}

// Get users list for filter dropdown
export async function getTimeTrackingUsers(companyId: string) {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('company_id', companyId)
    .order('full_name', { ascending: true });

  if (!users) return [];

  return users.map((u) => ({ id: u.id, name: u.full_name }));
}
