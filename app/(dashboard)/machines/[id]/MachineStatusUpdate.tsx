'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'

interface MachineStatusUpdateProps {
  machineId: string
  currentStatus: string
}

export default function MachineStatusUpdate({ machineId, currentStatus }: MachineStatusUpdateProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const statusOptions = [
    { value: 'active', label: 'Aktywna', icon: '✅', color: 'bg-green-600 hover:bg-green-700' },
    { value: 'maintenance', label: 'W konserwacji', icon: '🔧', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { value: 'inactive', label: 'Nieaktywna', icon: '⏸️', color: 'bg-gray-600 hover:bg-gray-700' },
    { value: 'broken', label: 'Awaria', icon: '🚨', color: 'bg-red-600 hover:bg-red-700' },
  ]

  const updateStatus = async (newStatus: string) => {
    if (newStatus === currentStatus) return

    setIsUpdating(true)
    const loadingToast = toast.loading('Aktualizacja statusu...')

    try {
      const { error } = await supabase
        .from('machines')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', machineId)

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success(`Status zmieniony na: ${statusOptions.find(s => s.value === newStatus)?.label}`)
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      logger.error('Error updating status', { error })
      toast.error('Nie udało się zmienić statusu')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statusOptions.map(option => (
        <Button
          key={option.value}
          onClick={() => updateStatus(option.value)}
          disabled={isUpdating || option.value === currentStatus}
          variant="ghost"
          className={`${option.value === currentStatus ? option.color + ' text-white' : ''}`}
        >
          {option.icon} {option.label}
        </Button>
      ))}
    </div>
  )
}
