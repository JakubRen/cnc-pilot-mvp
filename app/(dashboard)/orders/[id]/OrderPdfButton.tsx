'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { saveAs } from 'file-saver'
import { sanitizeFileName } from '@/lib/pdf/styles'

interface OrderPdfButtonProps {
  orderId: string
  orderNumber: string
}

export default function OrderPdfButton({ orderId, orderNumber }: OrderPdfButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/pdf/order/${orderId}`)
      if (!response.ok) throw new Error('PDF error')
      const blob = await response.blob()
      saveAs(blob, `Zamowienie_${sanitizeFileName(orderNumber)}.pdf`)
      toast.success('PDF pobrany!')
    } catch {
      toast.error('Blad generowania PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="px-4 py-2 text-sm rounded-lg bg-muted text-foreground hover:bg-accent transition flex items-center gap-2 disabled:opacity-50"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Generowanie...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Eksportuj PDF
        </>
      )}
    </button>
  )
}
