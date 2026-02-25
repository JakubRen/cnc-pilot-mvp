'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { feedbackLoggers } from '@/lib/ai/feedback-logger'
import {
  OperationType,
  OperationFormData,
  operationTypeLabels,
  complexityLabels,
  Complexity,
  calculateOperationCost,
  formatDuration,
  formatCost
} from '@/types/operations'

interface Machine {
  id: string
  name: string
  code: string | null
  model: string | null
  status: string
  hourly_rate: number
}

interface OperationFormProps {
  operations: OperationFormData[]
  onChange: (operations: OperationFormData[]) => void
  quantity: number
  complexity?: Complexity
  companyId: string
}

export default function OperationForm({
  operations,
  onChange,
  quantity,
  complexity,
  companyId
}: OperationFormProps) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [isLoadingMachines, setIsLoadingMachines] = useState(true)
  const [estimatingIndex, setEstimatingIndex] = useState<number | null>(null)
  const aiEstimatedTimes = useRef<Map<number, { setup: number; run: number }>>(new Map())

  // Load machines
  useEffect(() => {
    async function loadMachines() {
      setIsLoadingMachines(true)
      try {
        const { data, error } = await supabase
          .from('machines')
          .select('id, name, code, model, status, hourly_rate')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('name', { ascending: true })

        if (error) throw error
        setMachines(data || [])
      } catch (error) {
        logger.error('Error loading machines', { error })
        toast.error('Nie udało się załadować listy maszyn')
      } finally {
        setIsLoadingMachines(false)
      }
    }

    loadMachines()
  }, [companyId])

  // Add new operation (memoized for stability)
  const addOperation = useCallback(() => {
    const newOperation: OperationFormData & { _id: string } = {
      _id: `op-${Date.now()}-${Math.random()}`, // Unique ID for React key
      operation_number: operations.length + 1,
      operation_type: 'milling',
      operation_name: '',
      description: '',
      machine_id: undefined,
      setup_time_minutes: 0,
      run_time_per_unit_minutes: 0,
      hourly_rate: 180 // Default rate
    }

    onChange([...operations, newOperation] as OperationFormData[])
  }, [operations, onChange])

  // Remove operation (memoized for stability)
  const removeOperation = useCallback((index: number) => {
    const updated = operations.filter((_, i) => i !== index)
    // Renumber operations
    const renumbered = updated.map((op, i) => ({
      ...op,
      operation_number: i + 1
    }))
    onChange(renumbered)
  }, [operations, onChange])

  // Update operation field (memoized for stability)
  const updateOperation = useCallback((index: number, field: keyof OperationFormData, value: any) => {
    const updated = [...operations]
    updated[index] = { ...updated[index], [field]: value }

    // If machine changed, update hourly rate
    if (field === 'machine_id' && value) {
      const machine = machines.find(m => m.id === value)
      if (machine) {
        updated[index].hourly_rate = machine.hourly_rate
      }
    }

    onChange(updated)
  }, [operations, machines, onChange])

  // Auto-estimate times based on operation type and complexity
  const autoEstimate = async (index: number) => {
    const operation = operations[index]

    if (!operation.operation_type) {
      toast.error('Wybierz typ operacji')
      return
    }

    setEstimatingIndex(index)
    const loadingToast = toast.loading('Szacuję czasy operacji...')

    try {
      const { data, error } = await supabase.rpc('estimate_operation_times', {
        p_operation_type: operation.operation_type,
        p_complexity: complexity || 'medium',
        p_material: 'steel' // Default, można rozszerzyć
      })

      if (error) {
        logger.error('RPC estimate_operation_times error', { error })
        throw error
      }

      if (data && data.length > 0 && data[0].setup_time_minutes > 0) {
        const estimate = data[0]
        updateOperation(index, 'setup_time_minutes', estimate.setup_time_minutes)
        updateOperation(index, 'run_time_per_unit_minutes', estimate.run_time_per_unit_minutes)
        aiEstimatedTimes.current.set(index, { setup: estimate.setup_time_minutes, run: estimate.run_time_per_unit_minutes })

        toast.dismiss(loadingToast)
        toast.success('Czasy oszacowane!')
      } else {
        // Fallback: Use default values based on complexity and operation type
        logger.warn('RPC returned empty or zero data, using fallback values')

        const fallbackSetup = complexity === 'simple' ? 15 : complexity === 'complex' ? 60 : 30
        const fallbackRun = complexity === 'simple' ? 2 : complexity === 'complex' ? 10 : 5

        updateOperation(index, 'setup_time_minutes', fallbackSetup)
        updateOperation(index, 'run_time_per_unit_minutes', fallbackRun)
        aiEstimatedTimes.current.set(index, { setup: fallbackSetup, run: fallbackRun })

        toast.dismiss(loadingToast)
        toast.success('Czasy oszacowane (wartości domyślne)')
      }
    } catch (error) {
      logger.error('Auto-estimate failed', { error })
      toast.dismiss(loadingToast)
      toast.error('Błąd podczas szacowania: ' + (error as Error).message)
    } finally {
      setEstimatingIndex(null)
    }
  }

  // Move operation up/down (memoized for stability)
  const moveOperation = useCallback((index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === operations.length - 1) return

    const updated = [...operations]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    // Swap
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp

    // Renumber
    const renumbered = updated.map((op, i) => ({
      ...op,
      operation_number: i + 1
    }))

    onChange(renumbered)
  }, [operations, onChange])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-foreground font-medium">
          🔧 Operacje Technologiczne
        </label>
        <button
          type="button"
          onClick={addOperation}
          data-testid="add-operation-button"
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold text-sm"
        >
          + Dodaj Operację
        </button>
      </div>

      {operations.length === 0 ? (
        <div className="bg-muted border-2 border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Brak operacji. Dodaj pierwszą operację aby określić routing produkcyjny.
          </p>
          <button
            type="button"
            onClick={addOperation}
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
          >
            + Dodaj Pierwszą Operację
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {operations.map((operation, index) => {
            const costs = calculateOperationCost(
              operation.setup_time_minutes,
              operation.run_time_per_unit_minutes,
              quantity,
              operation.hourly_rate
            )

            return (
              <div
                key={`op-${index}`}
                data-testid={`operation-${index + 1}`}
                className="bg-muted p-6 rounded-lg border-2 border-border"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-foreground">
                      #{operation.operation_number}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => moveOperation(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Przesuń w górę"
                      >
                        ⬆️
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOperation(index, 'down')}
                        disabled={index === operations.length - 1}
                        className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Przesuń w dół"
                      >
                        ⬇️
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOperation(index)}
                    data-testid={`remove-operation-${index + 1}`}
                    className="text-red-400 hover:text-red-300 text-sm font-medium"
                  >
                    ✕ Usuń
                  </button>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Operation Type */}
                  <div>
                    <label className="block text-muted-foreground text-sm mb-2">
                      Typ operacji *
                    </label>
                    <select
                      value={operation.operation_type}
                      onChange={(e) => updateOperation(index, 'operation_type', e.target.value as OperationType)}
                      data-testid={`operation-type-${index + 1}`}
                      className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none"
                    >
                      {Object.entries(operationTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Operation Name */}
                  <div>
                    <label className="block text-muted-foreground text-sm mb-2">
                      Nazwa operacji *
                    </label>
                    <input
                      type="text"
                      value={operation.operation_name}
                      onChange={(e) => updateOperation(index, 'operation_name', e.target.value)}
                      placeholder="np. Toczenie zgrubne"
                      data-testid={`operation-name-${index + 1}`}
                      className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  {/* Machine */}
                  <div>
                    <label className="block text-muted-foreground text-sm mb-2">
                      Maszyna (opcjonalnie)
                    </label>
                    <select
                      value={operation.machine_id || ''}
                      onChange={(e) => updateOperation(index, 'machine_id', e.target.value || undefined)}
                      data-testid={`machine-select-${index + 1}`}
                      className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none"
                      disabled={isLoadingMachines}
                    >
                      <option value="">Nie przypisano</option>
                      {machines.map(machine => (
                        <option key={machine.id} value={machine.id}>
                          {machine.name} ({machine.hourly_rate} PLN/h)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hourly Rate */}
                  <div>
                    <label className="block text-muted-foreground text-sm mb-2">
                      Stawka godzinowa (PLN/h) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={operation.hourly_rate}
                      onChange={(e) => updateOperation(index, 'hourly_rate', parseFloat(e.target.value) || 0)}
                      data-testid={`hourly-rate-${index + 1}`}
                      className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none"
                    />
                  </div>

                  {/* Setup Time */}
                  <div>
                    <label className="block text-muted-foreground text-sm mb-2">
                      ⏱️ Czas przygotowania (min) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={operation.setup_time_minutes}
                      onChange={(e) => {
                        const rawValue = e.target.value
                        const parsedValue = rawValue === '' ? 0 : parseInt(rawValue)
                        const finalValue = isNaN(parsedValue) ? 0 : parsedValue
                        console.error(`[OperationForm] Setup Time onChange - Operation ${index + 1}:`, {
                          raw: rawValue,
                          parsed: parsedValue,
                          final: finalValue
                        })
                        updateOperation(index, 'setup_time_minutes', finalValue)
                      }}
                      onBlur={() => {
                        const aiTimes = aiEstimatedTimes.current.get(index)
                        if (aiTimes) {
                          feedbackLoggers.time.log(
                            aiTimes.setup,
                            operation.setup_time_minutes,
                            { field: 'setup_time', operation_type: operation.operation_type, complexity }
                          )
                        }
                      }}
                      data-testid={`setup-time-${index + 1}`}
                      className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none"
                      placeholder="Czas przygotowania (jednorazowy)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Koszt przygotowania: {formatCost(costs.setupCost)}
                    </p>
                  </div>

                  {/* Run Time */}
                  <div>
                    <label className="block text-muted-foreground text-sm mb-2">
                      🔄 Czas obróbki (min/szt) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={operation.run_time_per_unit_minutes}
                      onChange={(e) => {
                        const rawValue = e.target.value
                        const parsedValue = rawValue === '' ? 0 : parseFloat(rawValue)
                        const finalValue = isNaN(parsedValue) ? 0 : parsedValue
                        console.error(`[OperationForm] Run Time onChange - Operation ${index + 1}:`, {
                          raw: rawValue,
                          parsed: parsedValue,
                          final: finalValue
                        })
                        updateOperation(index, 'run_time_per_unit_minutes', finalValue)
                      }}
                      onBlur={() => {
                        const aiTimes = aiEstimatedTimes.current.get(index)
                        if (aiTimes) {
                          feedbackLoggers.time.log(
                            aiTimes.run,
                            operation.run_time_per_unit_minutes,
                            { field: 'run_time', operation_type: operation.operation_type, complexity }
                          )
                        }
                      }}
                      data-testid={`run-time-${index + 1}`}
                      className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none"
                      placeholder="Czas obróbki 1 sztuki"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Koszt obróbki ({quantity} szt.): {formatCost(costs.runCost)}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-muted-foreground text-sm mb-2">
                      Opis (opcjonalnie)
                    </label>
                    <textarea
                      value={operation.description || ''}
                      onChange={(e) => updateOperation(index, 'description', e.target.value)}
                      rows={2}
                      placeholder="Dodatkowe informacje o operacji..."
                      className="w-full px-4 py-2 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Auto-estimate button */}
                <div className="flex items-center justify-between p-3 bg-violet-900/20 border border-violet-700/50 rounded-lg">
                  <div className="text-sm text-violet-200">
                    <p className="font-semibold mb-1">💡 Automatyczne szacowanie</p>
                    <p className="text-xs">
                      Kliknij aby oszacować czasy przygotowania i obróbki na podstawie typu operacji i złożoności
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => autoEstimate(index)}
                    disabled={estimatingIndex === index}
                    data-testid={`auto-estimate-${index + 1}`}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {estimatingIndex === index ? '⏳ Szacuję...' : '🤖 Oszacuj'}
                  </button>
                </div>

                {/* Cost summary */}
                <div className="mt-4 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-green-300 mb-1">Czas całkowity</p>
                      <p className="text-lg font-bold text-green-400">
                        {formatDuration(costs.totalTimeMinutes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-300 mb-1">Koszt przygotowania</p>
                      <p className="text-lg font-bold text-green-400">
                        {formatCost(costs.setupCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-300 mb-1">Koszt obróbki</p>
                      <p className="text-lg font-bold text-green-400">
                        {formatCost(costs.runCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-300 mb-1">Koszt całkowity</p>
                      <p className="text-xl font-bold text-green-400">
                        {formatCost(costs.totalCost)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Total summary */}
          {operations.length > 0 && (
            <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/30 border-2 border-violet-500/50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">📊 Podsumowanie wszystkich operacji</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const totalSetupTime = operations.reduce((sum, op) => sum + op.setup_time_minutes, 0)
                  const totalRunTime = operations.reduce((sum, op) => sum + (op.run_time_per_unit_minutes * quantity), 0)
                  const totalCost = operations.reduce((sum, op) => {
                    const costs = calculateOperationCost(
                      op.setup_time_minutes,
                      op.run_time_per_unit_minutes,
                      quantity,
                      op.hourly_rate
                    )
                    return sum + costs.totalCost
                  }, 0)

                  return (
                    <>
                      <div className="text-center">
                        <p className="text-sm text-violet-300 mb-1">Czas przygotowania</p>
                        <p className="text-2xl font-bold text-white">
                          {formatDuration(totalSetupTime)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-violet-300 mb-1">Czas obróbki</p>
                        <p className="text-2xl font-bold text-white">
                          {formatDuration(totalRunTime)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-violet-300 mb-1">Czas całkowity</p>
                        <p className="text-2xl font-bold text-white">
                          {formatDuration(totalSetupTime + totalRunTime)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-violet-300 mb-1">Koszt całkowity</p>
                        <p className="text-3xl font-bold text-green-400">
                          {formatCost(totalCost)}
                        </p>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-violet-900/20 border border-violet-700/50 rounded-lg p-4 text-sm text-violet-200">
        <p className="font-semibold mb-2">ℹ️ Informacja o czasach operacji:</p>
        <ul className="list-disc list-inside space-y-1 text-violet-300 text-xs">
          <li><strong>Czas przygotowania:</strong> Czas przygotowawczy maszyny - jednorazowy, niezależny od ilości sztuk</li>
          <li><strong>Czas obróbki:</strong> Czas obróbki jednej sztuki - mnożony przez ilość w zleceniu</li>
          <li><strong>Koszt całkowity:</strong> Koszt przygotowania + (Czas obróbki × ilość × stawka)</li>
          <li>Kolejność operacji (#1, #2, #3...) określa routing produkcyjny</li>
        </ul>
      </div>
    </div>
  )
}
