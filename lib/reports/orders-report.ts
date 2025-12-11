// Orders Report queries and data processing

import { createClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

export interface OrdersReportFilters {
  status?: string;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
  operatorId?: number;
}

export interface OrderReportData {
  id: string;
  order_number: string;
  customer_name: string;
  part_name: string | null;
  quantity: number;
  status: string;
  deadline: string;
  created_at: string;
  total_cost: number | null;
  created_by: number;
  creator_name: string | null;
}

export async function getOrdersReport(
  companyId: string,
  filters: OrdersReportFilters = {}
): Promise<OrderReportData[]> {
  const supabase = await createClient();

  let query = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      part_name,
      quantity,
      status,
      deadline,
      created_at,
      total_cost,
      created_by,
      creator:users!orders_created_by_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.customer) {
    query = query.ilike('customer_name', `%${filters.customer}%`);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  if (filters.operatorId) {
    query = query.eq('created_by', filters.operatorId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching orders report', { error });
    return [];
  }

  return (data || []).map((order) => {
    const creator = order.creator as { full_name: string } | { full_name: string }[] | null;
    const creatorName = Array.isArray(creator)
      ? creator[0]?.full_name
      : creator?.full_name;
    return {
      ...order,
      creator_name: creatorName ?? null,
    };
  });
}

// Get orders summary statistics
export async function getOrdersReportSummary(companyId: string) {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('status, total_cost')
    .eq('company_id', companyId);

  if (!orders) return null;

  const summary = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    delayed: orders.filter((o) => o.status === 'delayed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    total_revenue: orders.reduce((sum, o) => sum + (o.total_cost || 0), 0),
  };

  return summary;
}

// Get top customers by order count
export async function getTopCustomers(companyId: string, limit = 10) {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name')
    .eq('company_id', companyId);

  if (!orders) return [];

  // Count orders per customer
  const customerCounts = orders.reduce((acc, order) => {
    acc[order.customer_name] = (acc[order.customer_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort and limit
  return Object.entries(customerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([customer, count]) => ({ customer, count }));
}
