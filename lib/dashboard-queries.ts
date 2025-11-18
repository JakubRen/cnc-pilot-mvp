// Dashboard data queries for metrics and widgets
import { createClient } from '@/lib/supabase-server';

// ============================================
// METRIC QUERIES
// ============================================

export async function getTotalOrders(companyId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (error) {
    console.error('Error fetching total orders:', error);
    return 0;
  }
  return count || 0;
}

export async function getActiveOrders(companyId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'in_progress');

  if (error) {
    console.error('Error fetching active orders:', error);
    return 0;
  }
  return count || 0;
}

export async function getCompletedThisWeek(companyId: string) {
  const supabase = await createClient();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('created_at', oneWeekAgo.toISOString()); // Changed from completed_at to created_at

  if (error) {
    console.error('Error fetching completed this week:', error);
    return 0;
  }
  return count || 0;
}

export async function getOverdueOrders(companyId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('company_id', companyId)
    .neq('status', 'completed')
    .lt('deadline', today)
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching overdue orders:', error);
    return [];
  }
  return data || [];
}

export async function getActiveTimers(companyId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('time_logs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'running');

  if (error) {
    console.error('Error fetching active timers:', error);
    return 0;
  }
  return count || 0;
}

export async function getLowStockItems(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('company_id', companyId)
    .lt('quantity', supabase.rpc('low_stock_threshold'))
    .order('quantity', { ascending: true });

  // Fallback: if RPC doesn't work, use simple comparison
  if (error) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('inventory')
      .select('*')
      .eq('company_id', companyId)
      .order('quantity', { ascending: true });

    if (fallbackError) {
      console.error('Error fetching low stock items:', fallbackError);
      return [];
    }

    // Filter in-memory where quantity < low_stock_threshold
    return (fallbackData || []).filter(
      (item) => item.quantity < item.low_stock_threshold
    );
  }

  return data || [];
}

export async function getRevenueThisMonth(companyId: string) {
  // DAY 12: Fixed - total_cost column now exists!
  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('total_cost')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('created_at', startOfMonth.toISOString());

  if (error) {
    console.error('Error fetching revenue this month:', error);
    return 0;
  }

  const total = (data || []).reduce(
    (sum, order) => sum + (parseFloat(order.total_cost as any) || 0),
    0
  );

  return total;
}

// ============================================
// URGENT TASKS QUERIES
// ============================================

export async function getOrdersDueToday(companyId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('company_id', companyId)
    .neq('status', 'completed')
    .eq('deadline', today)
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching orders due today:', error);
    return [];
  }
  return data || [];
}

export async function getStaleTimers(companyId: string, hoursThreshold = 12) {
  const supabase = await createClient();
  const thresholdTime = new Date();
  thresholdTime.setHours(thresholdTime.getHours() - hoursThreshold);

  const { data, error } = await supabase
    .from('time_logs')
    .select(`
      *,
      order:orders!time_logs_order_id_fkey(order_number, customer_name),
      user:users!time_logs_user_id_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'running')
    .lt('start_time', thresholdTime.toISOString());

  if (error) {
    console.error('Error fetching stale timers:', error);
    return [];
  }
  return data || [];
}

// ============================================
// PRODUCTION PLANNING QUERIES
// ============================================

export async function getProductionPlan(companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      assigned_operator:users!orders_created_by_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .neq('status', 'completed')
    .order('deadline', { ascending: true })
    .limit(20); // Top 20 most urgent

  if (error) {
    console.error('Error fetching production plan:', error);
    return [];
  }
  return data || [];
}

// ============================================
// ACTIVITY FEED QUERIES
// ============================================

export async function getRecentActivity(companyId: string, limit = 10) {
  const supabase = await createClient();

  // Get recent orders created
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      status,
      created_at,
      creator:users!orders_created_by_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }

  // Format as activity items
  return (data || []).map((order) => {
    // Handle creator - it might be an array from the join
    const creatorName = Array.isArray(order.creator)
      ? (order.creator[0] as any)?.full_name
      : (order.creator as any)?.full_name;

    return {
      type: 'order_created',
      title: `Order #${order.order_number} created`,
      subtitle: `Customer: ${order.customer_name}`,
      actor: creatorName || 'Unknown',
      timestamp: order.created_at,
    };
  });
}

// ============================================
// TOP CUSTOMERS QUERY
// ============================================

export async function getTopCustomers(companyId: string, limit = 5) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('customer_name, total_cost')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .not('total_cost', 'is', null)
    .gt('total_cost', 0);

  if (error) {
    console.error('Error fetching top customers:', error);
    return [];
  }

  // Group by customer and sum revenue
  const customerRevenue = (data || []).reduce((acc, order) => {
    const customer = order.customer_name;
    if (!acc[customer]) {
      acc[customer] = { name: customer, revenue: 0, count: 0 };
    }
    acc[customer].revenue += parseFloat(order.total_cost as any);
    acc[customer].count += 1;
    return acc;
  }, {} as Record<string, { name: string; revenue: number; count: number }>);

  // Convert to array and sort by revenue
  return Object.values(customerRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// ============================================
// CHART DATA QUERIES
// ============================================

export async function getOrdersChartData(companyId: string) {
  const supabase = await createClient();

  // Get orders from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('orders')
    .select('created_at')
    .eq('company_id', companyId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching orders chart data:', error);
    return [];
  }

  // Group by date
  const groupedByDate = (data || []).reduce((acc: Record<string, number>, order) => {
    const date = new Date(order.created_at).toLocaleDateString('pl-PL', {
      month: 'short',
      day: 'numeric'
    });
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  // Convert to array format for recharts
  return Object.entries(groupedByDate).map(([date, orders]) => ({
    date,
    orders
  }));
}

// ============================================
// DASHBOARD SUMMARY (all data in one call)
// ============================================

export async function getDashboardSummary(companyId: string) {
  // Fetch all data in parallel
  const [
    totalOrders,
    activeOrders,
    completedThisWeek,
    overdueOrders,
    activeTimers,
    lowStockItems,
    revenueThisMonth,
    ordersDueToday,
    staleTimers,
    productionPlan,
    recentActivity,
    topCustomers,
    ordersChartData,
  ] = await Promise.all([
    getTotalOrders(companyId),
    getActiveOrders(companyId),
    getCompletedThisWeek(companyId),
    getOverdueOrders(companyId),
    getActiveTimers(companyId),
    getLowStockItems(companyId),
    getRevenueThisMonth(companyId),
    getOrdersDueToday(companyId),
    getStaleTimers(companyId),
    getProductionPlan(companyId),
    getRecentActivity(companyId),
    getTopCustomers(companyId),
    getOrdersChartData(companyId),
  ]);

  return {
    metrics: {
      totalOrders,
      activeOrders,
      completedThisWeek,
      overdueCount: overdueOrders.length,
      activeTimers,
      lowStockCount: lowStockItems.length,
      revenueThisMonth,
    },
    urgentTasks: {
      overdueOrders,
      ordersDueToday,
      lowStockItems,
      staleTimers,
    },
    productionPlan,
    recentActivity,
    topCustomers,
    ordersChartData,
  };
}
