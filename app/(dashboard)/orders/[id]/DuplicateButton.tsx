'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { duplicateOrder } from '../actions'

export default function DuplicateButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleDuplicate = async () => {
    if (!confirm(`Duplikować zamówienie ${orderNumber}? Kopia zostanie otwarta do edycji.`)) return

    setIsLoading(true)
    const { success, error, newOrderId } = await duplicateOrder(orderId)
    setIsLoading(false)

    if (!success) {
      toast.error(`Błąd duplikacji: ${error}`)
      return
    }

    toast.success(`Zamówienie ${orderNumber} zduplikowane`)
    router.push(`/orders/${newOrderId}/edit`)
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={isLoading}
      className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition font-semibold disabled:opacity-50"
    >
      {isLoading ? 'Duplikuję...' : 'Duplikuj'}
    </button>
  )
}
