'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface StatusDropdownProps {
  orderId: string
  currentStatus: string
}

export default function StatusDropdown({ orderId, currentStatus }: StatusDropdownProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return

    setIsUpdating(true)
    setStatus(newStatus) // Optimistic update

    const { error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    setIsUpdating(false)

    if (error) {
      toast.error('Nie udało się zmienić statusu: ' + error.message)
      setStatus(currentStatus) // Revert on error
      return
    }

    const statusLabels: Record<string, string> = {
      pending: 'Oczekujące',
      in_progress: 'W realizacji',
      completed: 'Ukończone',
      delayed: 'Opóźnione',
      cancelled: 'Anulowane'
    }
    toast.success(`Status zmieniony na: ${statusLabels[newStatus] || newStatus}`)
    router.refresh()
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-600 hover:bg-yellow-700',
      in_progress: 'bg-blue-600 hover:bg-blue-700',
      completed: 'bg-green-600 hover:bg-green-700',
      delayed: 'bg-red-600 hover:bg-red-700',
      cancelled: 'bg-gray-600 hover:bg-gray-700',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-600 hover:bg-gray-700'
  }

  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        className={`w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-white focus:border-blue-500 focus:outline-none font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getStatusColor(status)}`}
      >
        <option value="pending" className="bg-white dark:bg-slate-800 text-slate-900">Oczekujące</option>
        <option value="in_progress" className="bg-white dark:bg-slate-800 text-slate-900">W realizacji</option>
        <option value="completed" className="bg-white dark:bg-slate-800 text-slate-900">Ukończone</option>
        <option value="delayed" className="bg-white dark:bg-slate-800 text-slate-900">Opóźnione</option>
        <option value="cancelled" className="bg-white dark:bg-slate-800 text-slate-900">Anulowane</option>
      </select>
      {isUpdating && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Aktualizowanie statusu...</p>
        </div>
      )}
      <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">
        Zmień status bez otwierania formularza edycji
      </p>
    </div>
  )
}
