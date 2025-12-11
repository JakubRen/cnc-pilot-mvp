'use server'

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

interface TimeLogActionResponse {
  success: boolean
  message?: string
  timeLogId?: string
  newOrderStatus?: string
}

export async function startTimer(orderId: string): Promise<TimeLogActionResponse> {
  const supabase = await createClient()
  const userProfile = await getUserProfile()

  if (!userProfile) {
    return { success: false, message: 'User not authenticated.' }
  }

  // Check if user already has an active timer
  const { data: activeLog, error: activeLogError } = await supabase
    .from('time_logs')
    .select('id, status')
    .eq('user_id', userProfile.id)
    .eq('company_id', userProfile.company_id)
    .in('status', ['running', 'paused'])
    .limit(1)
    .single()

  if (activeLogError && activeLogError.code !== 'PGRST116') { // PGRST116 = no rows
    logger.error('Error checking for active timer', { error: activeLogError.message })
    return { success: false, message: 'Failed to check for active timer.' }
  }

  if (activeLog) {
    return { success: false, message: 'An active timer already exists for this user. Please stop it first.' }
  }

  // Fetch order details for auto-deduct logic
  const { data: orderToStart, error: orderFetchError } = await supabase
    .from('orders')
    .select('id, quantity, linked_inventory_item_id, material_quantity_needed, status')
    .eq('id', orderId)
    .eq('company_id', userProfile.company_id)
    .single()

  if (orderFetchError || !orderToStart) {
    logger.error('Error fetching order for timer start', { error: orderFetchError?.message })
    return { success: false, message: 'Failed to retrieve order details.' }
  }

  // --- Auto-Deduct Logic ---
  if (orderToStart.linked_inventory_item_id && orderToStart.material_quantity_needed !== null) {
    const totalMaterialNeeded = orderToStart.quantity * orderToStart.material_quantity_needed;

    // Fetch current inventory item
    const { data: inventoryItem, error: inventoryFetchError } = await supabase
      .from('inventory')
      .select('id, quantity, name')
      .eq('id', orderToStart.linked_inventory_item_id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (inventoryFetchError || !inventoryItem) {
      logger.error('Error fetching inventory item for auto-deduct', { error: inventoryFetchError?.message })
      return { success: false, message: 'Failed to retrieve linked inventory item.' }
    }

    if (inventoryItem.quantity < totalMaterialNeeded) {
      return { success: false, message: `Brak wystarczającej ilości materiału '${inventoryItem.name}' w magazynie. Potrzeba: ${totalMaterialNeeded}, dostępne: ${inventoryItem.quantity}.` }
    }

    // Deduct from inventory
    const { error: deductError } = await supabase
      .from('inventory')
      .update({ quantity: inventoryItem.quantity - totalMaterialNeeded })
      .eq('id', inventoryItem.id)
      .eq('company_id', userProfile.company_id)

    if (deductError) {
      logger.error('Error deducting material from inventory', { error: deductError.message })
      return { success: false, message: 'Failed to deduct material from inventory.' }
    }
    revalidatePath('/inventory') // Revalidate inventory page
    revalidatePath(`/inventory/${inventoryItem.id}`) // Revalidate specific inventory item page
  }
  // --- End Auto-Deduct Logic ---

  // Fetch the hourly rate at the time of starting the timer
  const hourlyRate = userProfile.hourly_rate || 0

  // Insert a new time log
  const { data: newTimeLog, error: insertError } = await supabase
    .from('time_logs')
    .insert({
      order_id: orderId,
      user_id: userProfile.id,
      company_id: userProfile.company_id,
      start_time: new Date().toISOString(),
      status: 'running',
      hourly_rate: hourlyRate,
    })
    .select('id')
    .single()

  if (insertError) {
    logger.error('Error starting timer', { error: insertError.message })
    // IMPORTANT: If timer insertion fails AFTER deduction, we need to revert inventory.
    // For MVP, we'll keep it simple, but in production, this needs a transaction or compensating action.
    return { success: false, message: `Failed to start timer: ${insertError.message}` }
  }

  // Update order status to 'in_progress' if it was 'pending'
  if (orderToStart.status === 'pending') {
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ status: 'in_progress' })
      .eq('id', orderId)
      .eq('company_id', userProfile.company_id)

    if (updateOrderError) {
      logger.error('Error updating order status to in_progress', { error: updateOrderError.message })
      // This is not critical enough to fail the timer start, but log it
    }
  }
  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')

  revalidatePath('/kiosk') // Revalidate kiosk page
  revalidatePath('/time-tracking') // Revalidate time tracking page

  return { success: true, message: 'Timer started successfully!', timeLogId: newTimeLog.id }
}

export async function stopTimer(timeLogId: string, finalOrderStatus: string = 'completed'): Promise<TimeLogActionResponse> {
  const supabase = await createClient()
  const userProfile = await getUserProfile()

  if (!userProfile) {
    return { success: false, message: 'User not authenticated.' }
  }

  // Fetch the time log to stop
  const { data: timeLog, error: fetchError } = await supabase
    .from('time_logs')
    .select('*, orders(id)')
    .eq('id', timeLogId)
    .eq('user_id', userProfile.id)
    .eq('company_id', userProfile.company_id)
    .in('status', ['running', 'paused'])
    .single()

  if (fetchError) {
    logger.error('Error fetching time log', { error: fetchError.message })
    return { success: false, message: `Failed to fetch time log: ${fetchError.message}` }
  }

  if (!timeLog) {
    return { success: false, message: 'Active time log not found or unauthorized.' }
  }

  const endTime = new Date()
  const startTime = new Date(timeLog.start_time)
  const durationInSeconds = Math.max(0, (endTime.getTime() - startTime.getTime()) / 1000) // Ensure non-negative duration

  // Update the time log
  const { error: updateError } = await supabase
    .from('time_logs')
    .update({
      end_time: endTime.toISOString(),
      status: 'completed',
      duration_seconds: Math.round(durationInSeconds), // Store as integer seconds
      total_cost: (userProfile.hourly_rate || 0) * (durationInSeconds / 3600), // Calculate cost based on hourly rate
    })
    .eq('id', timeLogId)

  if (updateError) {
    logger.error('Error stopping timer', { error: updateError.message })
    return { success: false, message: `Failed to stop timer: ${updateError.message}` }
  }

  // Update related order status
  if (timeLog.orders?.id) {
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ status: finalOrderStatus })
      .eq('id', timeLog.orders.id)
      .eq('company_id', userProfile.company_id)

    if (updateOrderError) {
      logger.error('Error updating order status after stopping timer', { error: updateOrderError.message })
    }
    revalidatePath(`/orders/${timeLog.orders.id}`)
    revalidatePath('/orders')
  }

  revalidatePath('/kiosk')
  revalidatePath('/time-tracking')

  return { success: true, message: 'Timer stopped successfully!', newOrderStatus: finalOrderStatus }
}
