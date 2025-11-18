// Inventory Report queries and data processing

import { createClient } from '@/lib/supabase-server';

export interface InventoryReportFilters {
  category?: string;
  lowStockOnly?: boolean;
  searchQuery?: string;
}

export interface InventoryReportData {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  location: string | null;
  batch_number: string | null;
  created_at: string;
  created_by: number;
  creator_name: string | null;
}

export async function getInventoryReport(
  companyId: string,
  filters: InventoryReportFilters = {}
): Promise<InventoryReportData[]> {
  const supabase = await createClient();

  let query = supabase
    .from('inventory')
    .select(`
      id,
      sku,
      name,
      category,
      quantity,
      unit,
      low_stock_threshold,
      location,
      batch_number,
      created_at,
      created_by,
      creator:users!inventory_created_by_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  // Apply filters
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  if (filters.searchQuery) {
    query = query.or(
      `name.ilike.%${filters.searchQuery}%,sku.ilike.%${filters.searchQuery}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching inventory report:', error);
    return [];
  }

  let result = data || [];

  // Apply lowStockOnly filter after fetching (Supabase doesn't support column comparison in queries)
  if (filters.lowStockOnly) {
    result = result.filter(item => item.quantity < item.low_stock_threshold);
  }

  return result.map((item) => ({
    ...item,
    creator_name: Array.isArray(item.creator)
      ? (item.creator[0] as any)?.full_name
      : (item.creator as any)?.full_name,
  }));
}

// Get inventory summary statistics
export async function getInventoryReportSummary(companyId: string) {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('inventory')
    .select('category, quantity, low_stock_threshold')
    .eq('company_id', companyId);

  if (!items) return null;

  const summary = {
    total_items: items.length,
    total_value: 0, // Would need cost data from inventory table
    low_stock_count: items.filter(
      (i) => i.quantity < i.low_stock_threshold
    ).length,
    categories: Array.from(new Set(items.map((i) => i.category))).length,
  };

  return summary;
}

// Get inventory value by category (for charts)
export async function getInventoryByCategory(companyId: string) {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('inventory')
    .select('category, quantity, unit')
    .eq('company_id', companyId);

  if (!items) return [];

  // Group by category
  const categoryMap = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { category: item.category, count: 0 };
    }
    acc[item.category].count += 1;
    return acc;
  }, {} as Record<string, { category: string; count: number }>);

  return Object.values(categoryMap).sort((a, b) => b.count - a.count);
}

// Get categories list for filter dropdown
export async function getInventoryCategories(companyId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('inventory')
    .select('category')
    .eq('company_id', companyId);

  if (!items) return [];

  return Array.from(new Set(items.map((i) => i.category))).sort();
}
