'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateOperationStatus(
  operationId: string,
  status: 'pending' | 'in_progress' | 'completed',
  planId: string
): Promise<{ success: boolean; message?: string; allCompleted?: boolean }> {
  try {
    const supabase = await createClient()

    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = { status, updated_at: now }

    if (status === 'in_progress') {
      updateData.started_at = now
    }
    if (status === 'completed') {
      updateData.completed_at = now
    }

    const { error: opError } = await supabase
      .from('operations')
      .update(updateData)
      .eq('id', operationId)

    if (opError) {
      return { success: false, message: opError.message }
    }

    // If starting an operation, ensure production plan is in_progress
    if (status === 'in_progress') {
      const { data: plan } = await supabase
        .from('production_plans')
        .select('status')
        .eq('id', planId)
        .single()

      if (plan && (plan.status === 'draft' || plan.status === 'active')) {
        await supabase
          .from('production_plans')
          .update({ status: 'in_progress', updated_at: now })
          .eq('id', planId)
      }
    }

    // Check remaining incomplete operations
    const { count } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true })
      .eq('production_plan_id', planId)
      .neq('status', 'completed')

    revalidatePath(`/production/${planId}`)

    return { success: true, allCompleted: (count ?? 0) === 0 }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function completeProductionPlan(
  planId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Guard: check all operations are completed
    const { count } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true })
      .eq('production_plan_id', planId)
      .neq('status', 'completed')

    if ((count ?? 0) > 0) {
      return { success: false, message: 'Nie wszystkie operacje są zakończone' }
    }

    // Update production plan
    const { error: planError } = await supabase
      .from('production_plans')
      .update({ status: 'completed', updated_at: now })
      .eq('id', planId)

    if (planError) {
      return { success: false, message: planError.message }
    }

    // Update order status to ready_to_ship if order exists
    const { data: plan } = await supabase
      .from('production_plans')
      .select('order_id')
      .eq('id', planId)
      .single()

    if (plan?.order_id) {
      await supabase
        .from('orders')
        .update({ status: 'ready_to_ship', updated_at: now })
        .eq('id', plan.order_id)

      revalidatePath(`/orders/${plan.order_id}`)
    }

    revalidatePath(`/production/${planId}`)
    revalidatePath('/production')

    return { success: true }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' }
  }
}
