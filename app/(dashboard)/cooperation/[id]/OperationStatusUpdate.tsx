'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'
import { useTranslation } from '@/hooks/useTranslation'

interface OperationStatusUpdateProps {
  operationId: string
  currentStatus: string
  userId: number
}

export default function OperationStatusUpdate({ operationId, currentStatus, userId }: OperationStatusUpdateProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [isUpdating, setIsUpdating] = useState(false)

  const statusFlow: Record<string, { next: string[] }> = {
    pending: { next: ['sent'] },
    sent: { next: ['in_progress', 'returning'] },
    in_progress: { next: ['returning', 'delayed'] },
    returning: { next: ['completed'] },
    delayed: { next: ['in_progress', 'returning', 'completed'] },
    completed: { next: [] }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t('cooperation', 'prepared'),
      sent: t('cooperation', 'sent'),
      in_progress: t('cooperation', 'atCooperant'),
      returning: t('cooperation', 'onWayBack'),
      completed: t('cooperation', 'completed'),
      delayed: t('cooperation', 'delayed')
    }
    return labels[status] || status
  }

  const nextStatuses = statusFlow[currentStatus]?.next || []

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    const loadingToast = toast.loading(t('cooperation', 'updatingStatus'))

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
      toast.success(`${t('cooperation', 'statusChangedTo')} ${getStatusLabel(newStatus)}`)
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      logger.error('Error updating status', { error })
      toast.error(t('cooperation', 'statusChangeError'))
    } finally {
      setIsUpdating(false)
    }
  }

  if (currentStatus === 'completed') {
    return (
      <div className="text-center py-4">
        <span className="text-green-400 text-lg font-semibold">{t('cooperation', 'operationCompleted')}</span>
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
          {status === 'sent' && `📤 ${t('cooperation', 'btnSend')}`}
          {status === 'in_progress' && `🔧 ${t('cooperation', 'btnAtCooperant')}`}
          {status === 'returning' && `🚚 ${t('cooperation', 'btnOnWayBack')}`}
          {status === 'completed' && `✓ ${t('cooperation', 'btnComplete')}`}
          {status === 'delayed' && `⚠️ ${t('cooperation', 'btnDelayed')}`}
        </Button>
      ))}
    </div>
  )
}
