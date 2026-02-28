'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ReportCardProps {
  reportName: string
  rowCount: number
  summary: string
  csvUrl: string
  reportPageUrl: string
}

export default function ReportCard({ reportName, rowCount, summary, csvUrl, reportPageUrl }: ReportCardProps) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    if (!csvUrl || downloading) return
    setDownloading(true)
    try {
      const res = await fetch(csvUrl)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Extract filename from Content-Disposition or use default
      const disposition = res.headers.get('Content-Disposition')
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/)
      a.download = filenameMatch?.[1] || 'raport.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Nie udało się pobrać pliku. Raport mógł wygasnąć — wygeneruj go ponownie.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="border border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-800 rounded-lg p-3 my-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">📊</span>
        <span className="font-semibold text-sm">{reportName}</span>
        <span className="text-xs text-muted-foreground ml-auto">{rowCount} pozycji</span>
      </div>
      {summary && (
        <p className="text-xs text-muted-foreground mb-2">{summary}</p>
      )}
      <div className="flex gap-2">
        {csvUrl && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1 text-xs bg-violet-600 text-white rounded px-2.5 py-1 hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {downloading ? '⏳ Pobieram...' : '⬇ Pobierz Excel'}
          </button>
        )}
        <Link
          href={reportPageUrl}
          className="inline-flex items-center gap-1 text-xs border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 rounded px-2.5 py-1 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
        >
          → Pełny raport
        </Link>
      </div>
    </div>
  )
}
