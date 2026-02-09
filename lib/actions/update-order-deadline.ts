'use server'

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { logger } from '@/lib/logger'

export async function updateOrderDeadline(orderId: string, newDeadline: string) {
  const user = await getUserProfile()
  if (!user || !user.company_id) {
    return { error: 'Brak autoryzacji' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({ deadline: newDeadline })
    .eq('id', orderId)
    .eq('company_id', user.company_id)

  if (error) {
    logger.error('Failed to update order deadline', { orderId, newDeadline, error })
    return { error: 'Nie udało się zaktualizować terminu' }
  }

  logger.info('Order deadline updated via calendar drag', { orderId, newDeadline })
  return { success: true }
}
