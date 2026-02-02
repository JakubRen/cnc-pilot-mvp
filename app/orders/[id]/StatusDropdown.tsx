'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '../actions'

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

    const result = await updateOrderStatus(orderId, newStatus)

    setIsUpdating(false)

    if (!result.success) {
      toast.error('Nie udało się zmienić statusu: ' + result.error)
      setStatus(currentStatus) // Revert on error
      return
    }

    const statusLabels: Record<string, string> = {
      pending: 'Oczekujące',
      in_progress: 'W realizacji',
      completed: 'Ukończone',
      delayed: 'Opóźnione',
      cancelled: 'Anulowane',
      ready_to_ship: 'Do wysyłki',
    }
    toast.success(`Status zmieniony na: ${statusLabels[newStatus] || newStatus}`)
    router.refresh()
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-600 hover:bg-yellow-700',
      in_progress: 'bg-violet-600 hover:bg-violet-700',
      completed: 'bg-green-600 hover:bg-green-700',
      delayed: 'bg-red-600 hover:bg-red-700',
      cancelled: 'bg-gray-600 hover:bg-gray-700',
      ready_to_ship: 'bg-indigo-600 hover:bg-indigo-700',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-600 hover:bg-gray-700'
  }

  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        className={`w-full px-4 py-3 rounded-lg border border-border text-white focus:border-violet-500 focus:outline-none font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getStatusColor(status)}`}
      >
        <option value="pending" className="bg-card text-slate-900">Oczekujące</option>
        <option value="in_progress" className="bg-card text-slate-900">W realizacji</option>
        <option value="completed" className="bg-card text-slate-900">Ukończone</option>
        <option value="delayed" className="bg-card text-slate-900">Opóźnione</option>
        <option value="cancelled" className="bg-card text-slate-900">Anulowane</option>
        <option value="ready_to_ship" className="bg-card text-slate-900">Do wysyłki</option>
      </select>
      {isUpdating && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-xs">Aktualizowanie statusu...</p>
        </div>
      )}
      <p className="text-muted-foreground text-xs mt-2">
        Zmień status bez otwierania formularza edycji
      </p>
    </div>
  )
}
