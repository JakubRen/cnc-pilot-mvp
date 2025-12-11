'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function InventoryDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error in development
    logger.error('Inventory detail error', { error })
  }, [error])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Wystąpił błąd
        </h2>
        <p className="text-slate-400 mb-6">
          Nie udało się załadować szczegółów pozycji magazynowej. Spróbuj ponownie.
        </p>
        <button
          onClick={reset}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Spróbuj ponownie
        </button>
        <button
          onClick={() => window.location.href = '/inventory'}
          className="w-full mt-3 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
        >
          Wróć do magazynu
        </button>
      </div>
    </div>
  )
}
