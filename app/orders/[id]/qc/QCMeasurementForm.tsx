'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { QCItem, QCPlan } from './OrderQCClient'

interface Props {
  plans: QCPlan[]
  selectedPlanId: string
  onPlanChange: (planId: string) => void
  planItems: QCItem[]
  loadingItems: boolean
  batchNumber: string
  onBatchNumberChange: (value: string) => void
  sampleNumber: string
  onSampleNumberChange: (value: string) => void
  values: Record<string, string>
  onValueChange: (itemId: string, value: string) => void
  isSubmitting: boolean
  onSubmit: (e: React.FormEvent) => void
  onSwitchToCreatePlan: () => void
}

function getStatus(item: QCItem, val: string): 'ok' | 'nok' | 'empty' {
  if (!val || val.trim() === '') return 'empty'
  const num = parseFloat(val)
  if (isNaN(num)) return 'empty'
  const pass = num >= (item.nominal_value - item.tolerance_minus) && num <= (item.nominal_value + item.tolerance_plus)
  return pass ? 'ok' : 'nok'
}

export default function QCMeasurementForm({
  plans, selectedPlanId, onPlanChange, planItems, loadingItems,
  batchNumber, onBatchNumberChange, sampleNumber, onSampleNumberChange,
  values, onValueChange, isSubmitting, onSubmit, onSwitchToCreatePlan,
}: Props) {
  if (plans.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Brak planów kontroli</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          Najpierw utwórz plan kontroli z wymiarami do sprawdzenia
        </p>
        <Button variant="primary" onClick={onSwitchToCreatePlan}>
          + Utwórz plan kontroli
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        {/* Plan selector + batch/sample */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm mb-1">Plan kontroli</label>
            <select
              value={selectedPlanId}
              onChange={(e) => onPlanChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Wybierz plan --</option>
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}{plan.part_name ? ` (${plan.part_name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm mb-1">Nr partii</label>
            <Input
              value={batchNumber}
              onChange={(e) => onBatchNumberChange(e.target.value)}
              placeholder="np. LOT-001"
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm mb-1">Nr próbki</label>
            <Input
              type="number"
              min="1"
              value={sampleNumber}
              onChange={(e) => onSampleNumberChange(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {loadingItems && (
          <p className="text-slate-500 dark:text-slate-400 text-sm py-6 text-center">Ładowanie wymiarów...</p>
        )}

        {/* Measurement inputs */}
        {planItems.length > 0 && (
          <div className="space-y-3">
            {planItems.map((item) => {
              const status = getStatus(item, values[item.id] || '')
              const borderColor = status === 'ok' ? 'border-green-500' : status === 'nok' ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
              const bgColor = status === 'ok' ? 'bg-green-50 dark:bg-green-900/20' : status === 'nok' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-900'

              return (
                <div key={item.id} className={`p-4 rounded-lg border ${borderColor} ${bgColor} transition-colors`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 dark:text-white font-medium">{item.name}</span>
                      {item.is_critical && (
                        <span className="px-1.5 py-0.5 bg-red-600/30 text-red-600 dark:text-red-400 text-[10px] rounded font-semibold">KRYTYCZNY</span>
                      )}
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-mono">
                      {item.nominal_value} ±{Math.max(item.tolerance_plus, item.tolerance_minus)} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={values[item.id] || ''}
                      onChange={(e) => onValueChange(item.id, e.target.value)}
                      placeholder={String(item.nominal_value)}
                      className="flex-1 text-center font-mono text-lg"
                    />
                    <div className="w-20 text-center">
                      {status === 'ok' && <span className="text-green-600 dark:text-green-400 font-bold text-lg">✓ OK</span>}
                      {status === 'nok' && <span className="text-red-600 dark:text-red-400 font-bold text-lg">✕ NOK</span>}
                      {status === 'empty' && <span className="text-slate-400 text-sm">—</span>}
                    </div>
                  </div>

                  {/* Tolerance bar */}
                  {values[item.id] && status !== 'empty' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>{(item.nominal_value - item.tolerance_minus).toFixed(3)}</span>
                        <span>{item.nominal_value}</span>
                        <span>{(item.nominal_value + item.tolerance_plus).toFixed(3)}</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full relative">
                        <div className="absolute h-full bg-green-500/30 rounded-full" style={{ left: '0%', right: '0%' }} />
                        {(() => {
                          const min = item.nominal_value - item.tolerance_minus * 2
                          const max = item.nominal_value + item.tolerance_plus * 2
                          const range = max - min
                          const value = parseFloat(values[item.id])
                          const position = ((value - min) / range) * 100
                          const clamped = Math.max(0, Math.min(100, position))
                          return (
                            <div
                              className={`absolute w-2 h-4 -top-1 rounded ${status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ left: `${clamped}%`, transform: 'translateX(-50%)' }}
                            />
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <Button type="submit" disabled={isSubmitting} variant="primary" className="w-full mt-4">
              {isSubmitting ? 'Zapisywanie...' : 'Zapisz pomiary'}
            </Button>
          </div>
        )}

        {selectedPlanId && !loadingItems && planItems.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-6">Ten plan nie ma zdefiniowanych wymiarów</p>
        )}

        {!selectedPlanId && (
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-6">Wybierz plan kontroli aby rozpocząć pomiary</p>
        )}
      </div>
    </form>
  )
}
