'use server'

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'

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
    console.error('Error fetching original order:', fetchError.message)
    return { success: false, error: `Failed to fetch original order: ${fetchError.message}` }
  }

  if (!originalOrder) {
    return { success: false, error: 'Original order not found or unauthorized.' }
  }

  // Generate a new unique order number
  const newOrderNumber = `${originalOrder.order_number} (kopia ${Date.now().toString().slice(-4)})` // Appending a timestamp for uniqueness

  // Create the new order object
  const newOrder = {
    ...originalOrder,
    id: undefined, // Let Supabase generate a new ID
    order_number: newOrderNumber,
    status: 'pending', // Default status for duplicated order
    created_at: new Date().toISOString(), // Set new creation timestamp
    updated_at: new Date().toISOString(), // Set new update timestamp
    created_by: userProfile.id, // Assign to current user
    // Optionally clear/adjust other fields like priority, assigned_machine_id, assigned_operator_id
    // For now, copy all, but override key ones.
  }

  // Insert the new order
  const { data: duplicatedOrder, error: insertError } = await supabase
    .from('orders')
    .insert(newOrder)
    .select('id')
    .single()

  if (insertError) {
    console.error('Error duplicating order:', insertError.message)
    return { success: false, error: `Failed to duplicate order: ${insertError.message}` }
  }

  revalidatePath('/orders') // Revalidate the orders page to show the new order
  revalidatePath(`/orders/${duplicatedOrder.id}`) // Revalidate the new order's detail page

  return { success: true, newOrderId: duplicatedOrder.id }
}
