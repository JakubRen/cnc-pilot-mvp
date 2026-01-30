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
  product_id: string | null
  product_name: string | null
  available_quantity: number | null
  inventory_status: 'in_stock' | 'out_of_stock' | 'not_found'
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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  in_stock: {
    label: 'Na stanie',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  out_of_stock: {
    label: 'Brak na stanie',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  not_found: {
    label: 'Nie znaleziono w bazie',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
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

      const inStock = result.data.items.filter((i: ParsedItem) => i.inventory_status === 'in_stock').length
      const total = result.data.items.length
      if (inStock === total) {
        toast.success(`Znaleziono ${total} pozycji - wszystkie w magazynie`)
      } else {
        toast(`Znaleziono ${total} pozycji (${inStock} w magazynie, ${total - inStock} wymaga uwagi)`, { icon: '⚠️' })
      }
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

  const hasIssues = preview?.items.some(i => i.inventory_status !== 'in_stock')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              AI Import z maila
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Wklej treść maila - AI wyciągnie pozycje i sprawdzi magazyn
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
                  Analizuję i sprawdzam magazyn...
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
                      <th className="text-left p-3 text-slate-600 dark:text-slate-300">Magazyn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item, i) => {
                      const badge = STATUS_BADGE[item.inventory_status] || STATUS_BADGE.not_found
                      return (
                        <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="p-3 text-slate-400">{i + 1}</td>
                          <td className="p-3">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {item.product_name || item.part_name}
                            </div>
                            {item.product_name && item.product_name !== item.part_name && (
                              <div className="text-xs text-slate-400 line-through">
                                {item.part_name}
                              </div>
                            )}
                            {item.dimensions && (
                              <div className="text-xs text-slate-500">{item.dimensions}</div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {item.material || '—'}
                          </td>
                          <td className="p-3 text-right text-slate-900 dark:text-white">
                            {item.quantity}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                              {badge.label}
                            </span>
                            {item.inventory_status === 'in_stock' && item.available_quantity != null && (
                              <div className="text-xs text-slate-400 mt-1">
                                Dostępne: {item.available_quantity}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Warning if issues */}
              {hasIssues && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                    Niektóre pozycje nie zostały znalezione w magazynie. Po imporcie musisz ręcznie powiązać je z produktami z bazy.
                  </p>
                </div>
              )}

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
