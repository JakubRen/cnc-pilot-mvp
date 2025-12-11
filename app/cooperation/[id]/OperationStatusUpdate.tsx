'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'

interface OperationStatusUpdateProps {
  operationId: string
  currentStatus: string
  userId: number
}

export default function OperationStatusUpdate({ operationId, currentStatus, userId }: OperationStatusUpdateProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const statusFlow: Record<string, { next: string[]; label: string }> = {
    pending: { next: ['sent'], label: 'Przygotowane' },
    sent: { next: ['in_progress', 'returning'], label: 'Wysłane' },
    in_progress: { next: ['returning', 'delayed'], label: 'U kooperanta' },
    returning: { next: ['completed'], label: 'W drodze powrotnej' },
    delayed: { next: ['in_progress', 'returning', 'completed'], label: 'Opóźnione' },
    completed: { next: [], label: 'Zakończone' }
  }

  const statusLabels: Record<string, string> = {
    pending: 'Przygotowane',
    sent: 'Wysłane',
    in_progress: 'U kooperanta',
    returning: 'W drodze powrotnej',
    completed: 'Zakończone',
    delayed: 'Opóźnione'
  }

  const nextStatuses = statusFlow[currentStatus]?.next || []

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    const loadingToast = toast.loading('Aktualizacja statusu...')

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // Set dates based on status change
      if (newStatus === 'sent' && currentStatus === 'pending') {
        updateData.sent_date = new Date().toISOString()
      }
      if (newStatus === 'completed') {
        updateData.actual_return_date = new Date().toISOString()
        updateData.received_by = userId
      }

      const { error } = await supabase
        .from('external_operations')
        .update(updateData)
        .eq('id', operationId)

      if (error) throw error

      // If completed, update linked orders back to in_progress
      if (newStatus === 'completed') {
        const { data: items } = await supabase
          .from('external_operation_items')
          .select('order_id')
          .eq('external_operation_id', operationId)
          .not('order_id', 'is', null)

        if (items && items.length > 0) {
          const orderIds = items.map(i => i.order_id).filter(Boolean)
          if (orderIds.length > 0) {
            await supabase
              .from('orders')
              .update({ status: 'in_progress' })
              .in('id', orderIds)
          }
        }

        // Update items to returned
        await supabase
          .from('external_operation_items')
          .update({ status: 'returned' })
          .eq('external_operation_id', operationId)
      }

      toast.dismiss(loadingToast)
      toast.success(`Status zmieniony na: ${statusLabels[newStatus]}`)
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      logger.error('Error updating status', { error })
      toast.error('Nie udało się zmienić statusu')
    } finally {
      setIsUpdating(false)
    }
  }

  if (currentStatus === 'completed') {
    return (
      <div className="text-center py-4">
        <span className="text-green-400 text-lg font-semibold">✓ Operacja zakończona</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {nextStatuses.map(status => (
        <Button
          key={status}
          onClick={() => updateStatus(status)}
          disabled={isUpdating}
          variant={status === 'completed' ? 'primary' : status === 'delayed' ? 'danger' : 'ghost'}
          className={status === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {status === 'sent' && '📤 Wyślij'}
          {status === 'in_progress' && '🔧 U kooperanta'}
          {status === 'returning' && '🚚 W drodze powrotnej'}
          {status === 'completed' && '✓ Zakończ'}
          {status === 'delayed' && '⚠️ Opóźnione'}
        </Button>
      ))}
    </div>
  )
}
