'use server'

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

export async function updateOrderStatus(orderId: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const userProfile = await getUserProfile()

  if (!userProfile) {
    return { success: false, error: 'User not authenticated.' }
  }

  const { error } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('company_id', userProfile.company_id)

  if (error) {
    logger.error('Error updating order status', { error: error.message })
    return { success: false, error: error.message }
  }

  // Revalidate both list and detail pages
  revalidatePath('/orders', 'page')
  revalidatePath(`/orders/${orderId}`, 'page')

  return { success: true }
}

export async function duplicateOrder(orderId: string): Promise<{ success: boolean; newOrderId?: string; error?: string }> {
  const supabase = await createClient()
  const userProfile = await getUserProfile()

  if (!userProfile) {
    return { success: false, error: 'User not authenticated.' }
  }

  // Fetch the order to duplicate
  const { data: originalOrder, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('company_id', userProfile.company_id) // Ensure user owns the order
    .single()

  if (fetchError) {
    logger.error('Error fetching original order', { error: fetchError.message })
    return { success: false, error: `Failed to fetch original order: ${fetchError.message}` }
  }

  if (!originalOrder) {
    return { success: false, error: 'Original order not found or unauthorized.' }
  }

  // Generate a proper order number via RPC
  const { data: newOrderNumber, error: rpcError } = await supabase
    .rpc('generate_order_number', { p_company_id: userProfile.company_id })

  if (rpcError || !newOrderNumber) {
    logger.error('Error generating order number for duplicate', { error: rpcError?.message })
    return { success: false, error: 'Failed to generate order number' }
  }

  // Create the new order: copy all fields, reset dates and status
  const newOrder = {
    ...originalOrder,
    id: undefined,
    order_number: newOrderNumber,
    status: 'pending',
    deadline: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: userProfile.id,
  }

  // Insert the new order
  const { data: duplicatedOrder, error: insertError } = await supabase
    .from('orders')
    .insert(newOrder)
    .select('id')
    .single()

  if (insertError) {
    logger.error('Error duplicating order', { error: insertError.message })
    return { success: false, error: `Failed to duplicate order: ${insertError.message}` }
  }

  revalidatePath('/orders') // Revalidate the orders page to show the new order
  revalidatePath(`/orders/${duplicatedOrder.id}`) // Revalidate the new order's detail page

  return { success: true, newOrderId: duplicatedOrder.id }
}
