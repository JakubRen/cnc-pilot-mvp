'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface ParsedItem {
  part_name: string
  material: string | null
  quantity: number
  unit_price: number | null
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  notes: string | null
}

interface ParseQuoteResult {
  items: ParsedItem[]
  customer_name: string | null
  customer_email: string | null
  deadline: string | null
  raw_summary: string
}

interface AIImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: ParseQuoteResult) => void
}

export default function AIImportDialog({ isOpen, onClose, onImport }: AIImportDialogProps) {
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [preview, setPreview] = useState<ParseQuoteResult | null>(null)

  if (!isOpen) return null

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error('Wklej treść maila lub zapytania')
      return
    }

    setIsAnalyzing(true)
    setPreview(null)

    try {
      const response = await fetch('/api/agents/parse-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Błąd analizy')
      }

      if (result.data.items.length === 0) {
        toast.error('Nie znaleziono pozycji do zaimportowania')
        return
      }

      setPreview(result.data)
      toast.success(`Znaleziono ${result.data.items.length} pozycji`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd połączenia z AI')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleConfirmImport = () => {
    if (!preview) return
    onImport(preview)
    handleClose()
    toast.success(`Zaimportowano ${preview.items.length} pozycji`)
  }

  const handleClose = () => {
    setText('')
    setPreview(null)
    setIsAnalyzing(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              AI Import z maila
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Wklej treść maila - AI wyciągnie pozycje ofertowe
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Treść maila / zapytania
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Wklej tutaj treść maila od klienta, np.:&#10;&#10;Dzień dobry, proszę o wycenę:&#10;- 50 szt tulei fi30x100mm ze stali 316L&#10;- 20 szt kołnierzy fi150x20mm z aluminium 6061&#10;Termin do 15.02.2026."
              className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none text-sm font-mono"
              disabled={isAnalyzing}
            />
            <p className="text-xs text-slate-400 mt-1">
              {text.length} / 10 000 znaków
            </p>
          </div>

          {/* Analyze Button */}
          {!preview && (
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !text.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Analizuję z AI...
                </>
              ) : (
                '🔍 Analizuj treść'
              )}
            </Button>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">
                  {preview.raw_summary}
                </p>
                {preview.customer_name && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Klient: {preview.customer_name}
                    {preview.deadline && ` | Termin: ${preview.deadline}`}
                  </p>
                )}
              </div>

              {/* Items table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-700">
                    <tr>
                      <th className="text-left p-3 text-slate-600 dark:text-slate-300">#</th>
                      <th className="text-left p-3 text-slate-600 dark:text-slate-300">Nazwa</th>
                      <th className="text-left p-3 text-slate-600 dark:text-slate-300">Materiał</th>
                      <th className="text-right p-3 text-slate-600 dark:text-slate-300">Ilość</th>
                      <th className="text-left p-3 text-slate-600 dark:text-slate-300">Wymiary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item, i) => (
                      <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="p-3 text-slate-400">{i + 1}</td>
                        <td className="p-3 text-slate-900 dark:text-white font-medium">{item.part_name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{item.material || '—'}</td>
                        <td className="p-3 text-right text-slate-900 dark:text-white">{item.quantity}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{item.dimensions || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Popraw treść
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmImport}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  Importuj {preview.items.length} pozycji
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
