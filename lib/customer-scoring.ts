// Customer Scoring — computed from order history
// No DB migration needed, purely derived from orders table

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

export type CustomerTier = 'vip' | 'regular' | 'new' | 'inactive' | 'one_time'

export interface CustomerScore {
  tier: CustomerTier
  label: string
  icon: string
  color: string
  orderCount: number
  totalRevenue: number
  lastOrderDate: string | null
}

const TIER_CONFIG: Record<CustomerTier, { label: string; icon: string; color: string }> = {
  vip: { label: 'VIP', icon: '⭐', color: 'bg-amber-500 text-white' },
  regular: { label: 'Stały', icon: '🔵', color: 'bg-blue-500 text-white' },
  new: { label: 'Nowy', icon: '🟢', color: 'bg-green-500 text-white' },
  inactive: { label: 'Nieaktywny', icon: '⚪', color: 'bg-gray-400 text-white' },
  one_time: { label: 'Jednorazowy', icon: '🔸', color: 'bg-orange-400 text-white' },
}

function computeTier(orderCount: number, totalRevenue: number, lastOrderDate: string | null): CustomerTier {
  if (orderCount === 0) return 'new'

  const daysSinceLastOrder = lastOrderDate
    ? Math.ceil((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // VIP: 5+ orders OR revenue > 50,000 PLN
  if (orderCount >= 5 || totalRevenue >= 50000) return 'vip'

  // Inactive: had orders but none in 90+ days
  if (daysSinceLastOrder >= 90) return 'inactive'

  // One-time: exactly 1 order, 60+ days ago
  if (orderCount === 1 && daysSinceLastOrder >= 60) return 'one_time'

  // Regular: 2+ orders
  if (orderCount >= 2) return 'regular'

  // New: 1 order, recent
  return 'new'
}

export interface CustomerOrderStats {
  customerName: string
  orderCount: number
  totalRevenue: number
  lastOrderDate: string | null
}

/** Fetch order stats grouped by customer_name for the entire company */
export async function getCustomerOrderStats(companyId: string): Promise<Map<string, CustomerOrderStats>> {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('customer_name, selling_price, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching customer order stats', { error })
    return new Map()
  }

  const statsMap = new Map<string, CustomerOrderStats>()

  for (const order of orders || []) {
    const name = order.customer_name
    const existing = statsMap.get(name)

    if (existing) {
      existing.orderCount++
      existing.totalRevenue += order.selling_price || 0
      // lastOrderDate is already the most recent (sorted desc)
    } else {
      statsMap.set(name, {
        customerName: name,
        orderCount: 1,
        totalRevenue: order.selling_price || 0,
        lastOrderDate: order.created_at,
      })
    }
  }

  return statsMap
}

/** Compute score for a single customer name */
export function scoreCustomer(stats: CustomerOrderStats | undefined): CustomerScore {
  const orderCount = stats?.orderCount || 0
  const totalRevenue = stats?.totalRevenue || 0
  const lastOrderDate = stats?.lastOrderDate || null

  const tier = computeTier(orderCount, totalRevenue, lastOrderDate)
  const config = TIER_CONFIG[tier]

  return {
    tier,
    ...config,
    orderCount,
    totalRevenue,
    lastOrderDate,
  }
}
