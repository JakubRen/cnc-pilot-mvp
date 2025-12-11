import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export interface PricingEstimate {
  avgPrice: number
  minPrice: number
  maxPrice: number
  avgDuration: number
  orderCount: number
  lastOrderDate: string
  confidence: 'high' | 'medium' | 'low' | 'none'
}

export interface SimilarOrder {
  id: string
  order_number: string
  part_name: string
  material: string
  quantity: number
  total_cost: number
  actual_hours: number
  created_at: string
  status: string
}

export async function getSmartPricing(
  partName: string,
  material: string
): Promise<PricingEstimate | null> {
  try {
    if (!partName && !material) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get user's company_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile?.company_id) return null

    // Call RPC function
    const { data, error } = await supabase
      .rpc('get_similar_orders_stats', {
        p_company_id: userProfile.company_id,
        p_part_name: partName || null,
        p_material: material || null
      })

    if (error) throw error

    if (!data || data.length === 0 || data[0].order_count === 0) {
      return {
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        avgDuration: 0,
        orderCount: 0,
        lastOrderDate: '',
        confidence: 'none'
      }
    }

    const stats = data[0]
    
    // Calculate confidence based on order count
    let confidence: PricingEstimate['confidence'] = 'low'
    if (stats.order_count >= 10) confidence = 'high'
    else if (stats.order_count >= 3) confidence = 'medium'

    return {
      avgPrice: Number(stats.avg_price),
      minPrice: Number(stats.min_price),
      maxPrice: Number(stats.max_price),
      avgDuration: Number(stats.avg_duration_hours),
      orderCount: stats.order_count,
      lastOrderDate: stats.last_order_date,
      confidence
    }

  } catch (error) {
    logger.error('Error getting smart pricing', { error })
    return null
  }
}

export async function getSimilarOrdersList(
  partName: string,
  material: string
): Promise<SimilarOrder[]> {
  try {
    if (!partName && !material) return []

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile?.company_id) return []

    const { data, error } = await supabase
      .rpc('get_similar_orders', {
        p_company_id: userProfile.company_id,
        p_part_name: partName || null,
        p_material: material || null,
        p_limit: 5
      })

    if (error) throw error

    return data || []

  } catch (error) {
    logger.error('Error getting similar orders', { error })
    return []
  }
}
