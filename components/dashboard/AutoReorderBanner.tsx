'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

// ============================================
// TYPES
// ============================================

export interface ReorderDraft {
  id: string
  product_name: string
  sku: string | null
  suggested_quantity: number
  current_stock: number
  days_until_stockout: number | null
  supplier_name: string | null
  estimated_cost: number | null
  urgency: 'critical' | 'standard'
  reason: string
  created_at: string
}

interface Props {
  drafts: ReorderDraft[]
  onAccept: (draftId: string) => Promise<void>
  onReject: (draftId: string) => Promise<void>
}

// ============================================
// COMPONENT
// ============================================

export default function AutoReorderBanner({ drafts, onAccept, onReject }: Props) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const visibleDrafts = drafts.filter(d => !dismissedIds.has(d.id))

  if (visibleDrafts.length === 0) return null

  const handleAccept = async (draftId: string) => {
    setProcessingIds(prev => new Set(prev).add(draftId))
    try {
      await onAccept(draftId)
      setDismissedIds(prev => new Set(prev).add(draftId))
      toast.success('Zamowienie zakupu zatwierdzone')
    } catch {
      toast.error('Blad zatwierdzania zamowienia')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(draftId)
        return next
      })
    }
  }

  const handleReject = async (draftId: string) => {
    setProcessingIds(prev => new Set(prev).add(draftId))
    try {
      await onReject(draftId)
      setDismissedIds(prev => new Set(prev).add(draftId))
      toast.success('Szkic odrzucony')
    } catch {
      toast.error('Blad odrzucania szkicu')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(draftId)
        return next
      })
    }
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F4E6;</span>
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Automatyczne zamowienia zakupu ({visibleDrafts.length})
          </h3>
        </div>
        <Link
          href="/inventory/purchase-orders"
          className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
        >
          Zobacz wszystkie
        </Link>
      </div>

      <p className="text-xs text-amber-700 dark:text-amber-400/80 mb-3">
        AI wykryl niskie stany magazynowe i przygotowal szkice zamowien zakupu. Zaakceptuj lub odrzuc ponizej.
      </p>

      {/* Draft items */}
      <div className="space-y-2">
        {visibleDrafts.slice(0, 5).map((draft) => {
          const isProcessing = processingIds.has(draft.id)
          const isUrgent = draft.urgency === 'critical'

          return (
            <div
              key={draft.id}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                isUrgent
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                  : 'bg-white dark:bg-card border-border'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {draft.product_name}
                  </span>
                  {isUrgent && (
                    <span className="flex-shrink-0 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                      PILNE
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {draft.sku && <>SKU: {draft.sku} | </>}Stan: {draft.current_stock} szt.
                  {draft.days_until_stockout != null && (
                    draft.days_until_stockout > 0
                      ? ` | Wyczerpanie za ${draft.days_until_stockout} dni`
                      : ' | WYCZERPANY'
                  )}
                </div>
                <div className="text-xs text-foreground/80 mt-0.5">
                  Sugerowane: <strong>{draft.suggested_quantity} szt.</strong>
                  {draft.estimated_cost != null && (
                    <span className="text-muted-foreground"> (~{draft.estimated_cost.toFixed(2)} PLN)</span>
                  )}
                </div>
                {draft.reason && (
                  <p className="text-[10px] text-muted-foreground mt-1 italic">{draft.reason}</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleAccept(draft.id)}
                  disabled={isProcessing}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-500 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '...' : 'Zatwierdz'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(draft.id)}
                  disabled={isProcessing}
                  className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground bg-muted hover:bg-accent rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Odrzuc
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {visibleDrafts.length > 5 && (
        <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-2 text-center">
          +{visibleDrafts.length - 5} kolejnych zamowien
        </p>
      )}
    </div>
  )
}
