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
      toast.error('Failed to update status: ' + error.message)
      setStatus(currentStatus) // Revert on error
      return
    }

    toast.success(`Status updated to: ${newStatus.replace('_', ' ')}`)
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
        className={`w-full px-4 py-3 rounded-lg border border-slate-700 text-white focus:border-blue-500 focus:outline-none font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getStatusColor(status)}`}
      >
        <option value="pending" className="bg-slate-800">Pending</option>
        <option value="in_progress" className="bg-slate-800">In Progress</option>
        <option value="completed" className="bg-slate-800">Completed</option>
        <option value="delayed" className="bg-slate-800">Delayed</option>
        <option value="cancelled" className="bg-slate-800">Cancelled</option>
      </select>
      {isUpdating && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs">Updating status...</p>
        </div>
      )}
      <p className="text-slate-400 text-xs mt-2">
        Change status without opening edit form
      </p>
    </div>
  )
}
