'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import type { OperationFormData, OperationType, Complexity } from '@/types/operations'

// ============================================
// TYPES (backend route returns snake_case)
// ============================================

/** Shape returned by POST /api/agents/generate-plan → data.operations[] */
interface BackendOperation {
  operation_type: OperationType
  operation_name: string
  description: string | null
  setup_time_minutes: number
  run_time_per_unit_minutes: number
  machine_suggestion: string | null
  hourly_rate: number | null
}

interface BackendPlanResponse {
  success: boolean
  data: {
    operations: BackendOperation[]
    total_setup_minutes: number
    total_run_minutes: number
    estimated_cost_pln: number | null
    confidence: number
  }
  reasoning: string
  model: string
}

/** Internal UI shape (matches OperationFormData) */
interface AIGeneratedOperation {
  operation_type: OperationType
  operation_name: string
  description: string
  setup_time_minutes: number
  run_time_per_unit_minutes: number
  hourly_rate: number
}

interface Props {
  partName: string
  material: string
  quantity: number
  complexity: Complexity
  dimensions?: { length?: number; width?: number; height?: number }
  notes?: string
  companyId: string
  onApplyOperations: (operations: OperationFormData[]) => void
}

// ============================================
// LOADING SKELETON
// ============================================

function GenerationSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

// ============================================
// PREVIEW CARD FOR A SINGLE OPERATION
// ============================================

function OperationPreviewCard({
  op,
  index,
  onUpdate,
  onRemove,
}: {
  op: AIGeneratedOperation
  index: number
  onUpdate: (index: number, field: keyof AIGeneratedOperation, value: string | number) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="bg-muted border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
            #{index + 1}
          </span>
          <input
            type="text"
            value={op.operation_name}
            onChange={(e) => onUpdate(index, 'operation_name', e.target.value)}
            className="text-sm font-medium text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-violet-500 focus:outline-none px-1 py-0.5 min-w-0 flex-1"
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="flex-shrink-0 text-xs text-red-400 hover:text-red-300 font-medium"
        >
          Usun
        </button>
      </div>

      <p className="text-xs text-muted-foreground px-1">{op.description}</p>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <label className="text-muted-foreground block mb-0.5">Setup (min)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={op.setup_time_minutes}
            onChange={(e) => onUpdate(index, 'setup_time_minutes', parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1 rounded bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-muted-foreground block mb-0.5">Run (min/szt)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={op.run_time_per_unit_minutes}
            onChange={(e) => onUpdate(index, 'run_time_per_unit_minutes', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1 rounded bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-muted-foreground block mb-0.5">Stawka (PLN/h)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={op.hourly_rate}
            onChange={(e) => onUpdate(index, 'hourly_rate', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1 rounded bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AIGenerateButton({
  partName,
  material,
  quantity,
  complexity,
  dimensions,
  notes,
  companyId,
  onApplyOperations,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [preview, setPreview] = useState<AIGeneratedOperation[] | null>(null)
  const [reasoning, setReasoning] = useState<string>('')

  const canGenerate = partName.trim().length > 0 && companyId

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Podaj nazwe czesci przed generowaniem planu')
      return
    }

    setIsGenerating(true)
    setPreview(null)

    try {
      const response = await fetch('/api/agents/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partName,
          material: material || undefined,
          quantity,
          complexity,
          dimensions: dimensions || undefined,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Blad serwera' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const raw: BackendPlanResponse = await response.json()

      if (!raw.data?.operations || raw.data.operations.length === 0) {
        toast.error('AI nie wygenerowalo zadnych operacji. Sprobuj podac wiecej szczegolow.')
        return
      }

      // Backend already returns snake_case — just default hourly_rate when null
      const operations: AIGeneratedOperation[] = raw.data.operations.map(op => ({
        operation_type: op.operation_type,
        operation_name: op.operation_name,
        description: op.description || '',
        setup_time_minutes: op.setup_time_minutes,
        run_time_per_unit_minutes: op.run_time_per_unit_minutes,
        hourly_rate: op.hourly_rate ?? 180,
      }))

      const reasoning = raw.reasoning || `Pewnosc: ${raw.data.confidence}%`

      setPreview(operations)
      setReasoning(reasoning)
      toast.success(`Wygenerowano ${operations.length} operacji`)
    } catch (err) {
      console.error('[AIGenerateButton] Error:', err)
      const message = err instanceof Error ? err.message : 'Blad generowania planu'
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUpdatePreview = (index: number, field: keyof AIGeneratedOperation, value: string | number) => {
    if (!preview) return
    const updated = [...preview]
    updated[index] = { ...updated[index], [field]: value }
    setPreview(updated)
  }

  const handleRemovePreview = (index: number) => {
    if (!preview) return
    setPreview(preview.filter((_, i) => i !== index))
  }

  const handleApply = () => {
    if (!preview || preview.length === 0) return

    const formOperations: OperationFormData[] = preview.map((op, i) => ({
      operation_number: i + 1,
      operation_type: op.operation_type,
      operation_name: op.operation_name,
      description: op.description,
      setup_time_minutes: op.setup_time_minutes,
      run_time_per_unit_minutes: op.run_time_per_unit_minutes,
      hourly_rate: op.hourly_rate,
    }))

    onApplyOperations(formOperations)
    setPreview(null)
    setReasoning('')
    toast.success('Plan AI zastosowany! Mozesz go edytowac ponizej.')
  }

  const handleDiscard = () => {
    setPreview(null)
    setReasoning('')
  }

  // ── Loading state ──
  if (isGenerating) {
    return (
      <div className="bg-violet-900/20 border-2 border-violet-500/30 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-violet-500/20">
          <svg className="animate-spin h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold text-violet-300">AI analizuje detal i generuje plan...</span>
        </div>
        <GenerationSkeleton />
      </div>
    )
  }

  // ── Preview state (editable before apply) ──
  if (preview && preview.length > 0) {
    return (
      <div className="bg-violet-900/20 border-2 border-violet-500/30 rounded-lg overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-violet-500/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#x2728;</span>
            <h3 className="text-sm font-semibold text-violet-300">
              Plan AI — {preview.length} operacji
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded transition"
            >
              Odrzuc
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded transition"
            >
              Zastosuj plan
            </button>
          </div>
        </div>

        {/* AI Reasoning */}
        {reasoning && (
          <div className="px-4 py-2 bg-violet-900/10 border-b border-violet-500/10">
            <p className="text-xs text-violet-300/80 italic">{reasoning}</p>
          </div>
        )}

        {/* Editable operation cards */}
        <div className="p-4 space-y-2">
          {preview.map((op, i) => (
            <OperationPreviewCard
              key={`ai-op-${i}`}
              op={op}
              index={i}
              onUpdate={handleUpdatePreview}
              onRemove={handleRemovePreview}
            />
          ))}
        </div>

        {/* Footer with apply */}
        <div className="p-4 pt-0 flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground">
            Edytuj wartosci powyzej przed zastosowaniem. Mozesz tez edytowac po zastosowaniu.
          </p>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 rounded-lg transition"
          >
            Zastosuj {preview.length} operacji
          </button>
        </div>
      </div>
    )
  }

  // ── Default: Generate button ──
  return (
    <div className="bg-violet-900/20 border-2 border-dashed border-violet-500/30 rounded-lg p-6 text-center">
      <div className="max-w-md mx-auto">
        <span className="text-3xl block mb-3">&#x2728;</span>
        <h3 className="text-base font-semibold text-foreground mb-1">
          Generuj plan produkcji z AI
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          AI zaproponuje operacje technologiczne na podstawie nazwy czesci, materialu i zlozonosci.
          Mozesz edytowac wynik przed zastosowaniem.
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          data-testid="ai-generate-plan-button"
          className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-600/20"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          Generuj plan AI
        </button>
        {!canGenerate && (
          <p className="text-[10px] text-amber-400 mt-2">
            Podaj nazwe czesci aby uaktywnic generowanie
          </p>
        )}
      </div>
    </div>
  )
}
