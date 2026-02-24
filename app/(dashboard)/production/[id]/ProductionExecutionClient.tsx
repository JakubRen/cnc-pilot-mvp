'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TIME } from '@/lib/constants/time'
import { supabase } from '@/lib/supabase'
import { useConfirmation } from '@/components/ui/ConfirmationDialog'
import { updateOperationStatus, completeProductionPlan } from '@/lib/production-actions'
import { operationTypeLabels, operationStatusLabels, operationStatusColors, formatDuration, formatCost } from '@/types/operations'
import type { Operation } from '@/types/operations'
import toast from 'react-hot-toast'

interface Props {
  planId: string
  orderId: string | null
  operations: Operation[]
  planStatus: string
  quantity: number
  currentUserId: number
  companyId: string
  hourlyRate: number
}

interface TimerState {
  operationId: string
  status: 'idle' | 'running'
  elapsedSeconds: number
  timeLogId: string | null
}

export default function ProductionExecutionClient({
  planId,
  orderId,
  operations: initialOperations,
  planStatus: initialPlanStatus,
  quantity,
  currentUserId,
  companyId,
  hourlyRate,
}: Props) {
  const router = useRouter()
  const { confirm, ConfirmDialog } = useConfirmation()
  const [operations, setOperations] = useState(initialOperations)
  const [planStatus, setPlanStatus] = useState(initialPlanStatus)
  const [timers, setTimers] = useState<Record<string, TimerState>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({})

  const allOpsCompleted = operations.every(op => op.status === 'completed')

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval)
    }
  }, [])

  const startTimerInterval = useCallback((opId: string) => {
    if (intervalsRef.current[opId]) clearInterval(intervalsRef.current[opId])
    intervalsRef.current[opId] = setInterval(() => {
      setTimers(prev => {
        const t = prev[opId]
        if (!t || t.status !== 'running') return prev
        return { ...prev, [opId]: { ...t, elapsedSeconds: t.elapsedSeconds + 1 } }
      })
    }, 1000)
  }, [])

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / TIME.SECONDS_PER_HOUR)
    const m = Math.floor((seconds % TIME.SECONDS_PER_HOUR) / TIME.SECONDS_PER_MINUTE)
    const s = seconds % TIME.SECONDS_PER_MINUTE
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleStart = async (opId: string) => {
    setLoading(prev => ({ ...prev, [opId]: true }))
    try {
      // Create time log
      const { data: timeLog, error } = await supabase
        .from('time_logs')
        .insert({
          order_id: orderId,
          user_id: currentUserId,
          company_id: companyId,
          start_time: new Date().toISOString(),
          status: 'running',
          hourly_rate: hourlyRate,
          duration_seconds: 0,
          total_cost: 0,
        })
        .select()
        .single()

      if (error) throw error

      // Update operation status to in_progress
      const result = await updateOperationStatus(opId, 'in_progress', planId)
      if (!result.success) {
        toast.error(result.message || 'Błąd aktualizacji operacji')
        return
      }

      setOperations(prev => prev.map(op =>
        op.id === opId ? { ...op, status: 'in_progress' as const } : op
      ))
      setPlanStatus('in_progress')

      setTimers(prev => ({
        ...prev,
        [opId]: { operationId: opId, status: 'running', elapsedSeconds: 0, timeLogId: timeLog.id }
      }))
      startTimerInterval(opId)

      toast.success('Timer rozpoczęty')
    } catch (err) {
      toast.error('Nie udało się rozpocząć operacji')
    } finally {
      setLoading(prev => ({ ...prev, [opId]: false }))
    }
  }

  const handleStop = async (opId: string) => {
    const timer = timers[opId]
    if (!timer) return

    setLoading(prev => ({ ...prev, [opId]: true }))

    // Stop the interval
    if (intervalsRef.current[opId]) {
      clearInterval(intervalsRef.current[opId])
      delete intervalsRef.current[opId]
    }

    try {
      // Complete time log
      if (timer.timeLogId) {
        await supabase
          .from('time_logs')
          .update({
            status: 'completed',
            end_time: new Date().toISOString(),
            duration_seconds: timer.elapsedSeconds,
            total_cost: (timer.elapsedSeconds / TIME.SECONDS_PER_HOUR) * hourlyRate,
          })
          .eq('id', timer.timeLogId)
      }

      setTimers(prev => ({
        ...prev,
        [opId]: { ...prev[opId], status: 'idle' }
      }))

      // Ask if operation is completed
      const isCompleted = await confirm({
        title: 'Czy operacja zakończona?',
        description: `Czas pracy: ${formatTime(timer.elapsedSeconds)}. Czy ta operacja jest w pełni ukończona?`,
        confirmText: 'Tak, zakończona',
        cancelText: 'Nie, tylko stop',
        variant: 'info',
      })

      if (isCompleted) {
        const result = await updateOperationStatus(opId, 'completed', planId)
        if (!result.success) {
          toast.error(result.message || 'Błąd aktualizacji')
          return
        }

        setOperations(prev => prev.map(op =>
          op.id === opId ? { ...op, status: 'completed' as const } : op
        ))
        toast.success('Operacja zakończona')

        // Check if all operations are now completed
        if (result.allCompleted) {
          const shouldComplete = await confirm({
            title: 'To już wszystkie operacje!',
            description: 'Wszystkie operacje zostały zakończone. Czy chcesz zakończyć cały plan produkcji?',
            confirmText: 'Tak, zakończ produkcję',
            cancelText: 'Nie, jeszcze nie',
            variant: 'info',
          })

          if (shouldComplete) {
            await handleCompleteProduction(orderId)
          }
        }
      }
      // If not completed, operation stays as in_progress, timer stopped
    } catch (err) {
      toast.error('Błąd podczas zatrzymywania')
    } finally {
      setLoading(prev => ({ ...prev, [opId]: false }))
    }
  }

  const handleCompleteProduction = async (orderIdParam?: string | null) => {
    const result = await completeProductionPlan(planId, orderIdParam || orderId)
    if (result.success) {
      setPlanStatus('completed')
      toast.success('Plan produkcji zakończony!')
      router.refresh()
    } else {
      toast.error(result.message || 'Nie udało się zakończyć planu')
    }
  }

  const sortedOps = [...operations].sort((a, b) => a.operation_number - b.operation_number)

  return (
    <>
      <ConfirmDialog />
      <div className="bg-card border border-border rounded-lg p-6">
        {/* Header with complete button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">🔄 Routing Produkcyjny</h2>
          {(planStatus === 'in_progress' || planStatus === 'active') && (
            <button
              onClick={() => handleCompleteProduction(orderId)}
              disabled={!allOpsCompleted}
              title={!allOpsCompleted ? 'Zakończ wszystkie operacje najpierw' : 'Zakończ plan produkcji'}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition ${
                allOpsCompleted
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              ✅ Zakończ produkcję
            </button>
          )}
        </div>

        {sortedOps.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Brak operacji w planie produkcji</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedOps.map(operation => {
              const timer = timers[operation.id]
              const isRunning = timer?.status === 'running'
              const isLoading = loading[operation.id] || false
              const isCompleted = operation.status === 'completed'
              const machine = Array.isArray(operation.machine) ? operation.machine[0] : operation.machine
              const operator = Array.isArray(operation.assigned_operator)
                ? operation.assigned_operator[0]
                : operation.assigned_operator

              return (
                <div
                  key={operation.id}
                  className={`p-6 rounded-lg border ${
                    isCompleted
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : isRunning
                        ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-300 dark:border-violet-700'
                        : 'bg-muted border-border'
                  }`}
                >
                  {/* Operation Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl text-white ${
                        isCompleted ? 'bg-green-600' : isRunning ? 'bg-violet-600 animate-pulse' : 'bg-violet-600'
                      }`}>
                        #{operation.operation_number}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-foreground">
                            {operation.operation_name}
                          </h3>
                          <span className="px-3 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-100 text-sm font-semibold rounded">
                            {operationTypeLabels[operation.operation_type as keyof typeof operationTypeLabels]}
                          </span>
                        </div>
                        {operation.description && (
                          <p className="text-muted-foreground">{operation.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Timer display */}
                      {isRunning && timer && (
                        <div className="text-right mr-3">
                          <div className="text-2xl font-mono font-bold text-primary">
                            {formatTime(timer.elapsedSeconds)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {((timer.elapsedSeconds / TIME.SECONDS_PER_HOUR) * hourlyRate).toFixed(2)} PLN
                          </div>
                        </div>
                      )}

                      {/* Status badge */}
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold text-white ${operationStatusColors[operation.status as keyof typeof operationStatusColors]}`}>
                        {operationStatusLabels[operation.status as keyof typeof operationStatusLabels]}
                      </span>

                      {/* Start/Stop buttons */}
                      {!isCompleted && (
                        <div className="flex gap-2">
                          {!isRunning ? (
                            <button
                              onClick={() => handleStart(operation.id)}
                              disabled={isLoading}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoading ? '...' : '▶ Start'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStop(operation.id)}
                              disabled={isLoading}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoading ? '...' : '⏹ Stop'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operation Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-card rounded-lg border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Setup Time</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatDuration(operation.setup_time_minutes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Run Time/szt</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatDuration(operation.run_time_per_unit_minutes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Stawka</p>
                      <p className="text-lg font-bold text-foreground">
                        {operation.hourly_rate} PLN/h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Koszt setup</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCost((operation.setup_time_minutes / TIME.MINUTES_PER_HOUR) * operation.hourly_rate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Koszt run</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCost((operation.run_time_per_unit_minutes * quantity / TIME.MINUTES_PER_HOUR) * operation.hourly_rate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Koszt całkowity</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCost(operation.total_operation_cost || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Machine & Operator Info */}
                  {(machine || operator) && (
                    <div className="flex gap-6 mt-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                      {machine && (
                        <div>
                          <p className="text-xs text-primary mb-1">Maszyna</p>
                          <p className="text-sm font-semibold text-foreground">
                            🔧 {machine.name} ({machine.machine_type})
                          </p>
                        </div>
                      )}
                      {operator && (
                        <div>
                          <p className="text-xs text-primary mb-1">Operator</p>
                          <p className="text-sm font-semibold text-foreground">
                            👤 {operator.full_name}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
