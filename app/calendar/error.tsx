'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import Link from 'next/link'

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Calendar page error', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md text-center">
        <div className="text-6xl mb-4">📅</div>
        <h2 className="text-xl font-bold text-white mb-2">Wystąpił błąd</h2>
        <p className="text-slate-400 mb-6">
          Nie udało się załadować kalendarza. Spróbuj ponownie.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Spróbuj ponownie
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    </div>
  )
}
