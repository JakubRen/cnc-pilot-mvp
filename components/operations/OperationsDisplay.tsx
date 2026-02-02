'use client'

import { useState } from 'react'
import {
  Operation,
  OrderItem,
  operationTypeLabels,
  operationStatusLabels,
  operationStatusColors,
  formatDuration,
  formatCost,
  calculateOperationCost
} from '@/types/operations'

interface OperationsDisplayProps {
  orderItems: OrderItem[]
  editable?: boolean
}

export default function OperationsDisplay({ orderItems, editable = false }: OperationsDisplayProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  if (!orderItems || orderItems.length === 0) {
    return (
      <div className="bg-muted border-2 border-dashed border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          Brak pozycji w zleceniu. {editable && 'Dodaj pozycję aby określić operacje.'}
        </p>
      </div>
    )
  }

  // Calculate totals across all items
  const grandTotals = orderItems.reduce(
    (acc, item) => ({
      setupTime: acc.setupTime + (item.total_setup_time_minutes || 0),
      runTime: acc.runTime + (item.total_run_time_minutes || 0),
      cost: acc.cost + (item.total_cost || 0)
    }),
    { setupTime: 0, runTime: 0, cost: 0 }
  )

  return (
    <div className="space-y-4">
      {/* Grand totals header */}
      <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/30 border-2 border-violet-500/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">📊 Podsumowanie zlecenia</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-violet-300 mb-1">Pozycje</p>
            <p className="text-2xl font-bold text-white">{orderItems.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-violet-300 mb-1">Setup Time</p>
            <p className="text-2xl font-bold text-white">
              {formatDuration(grandTotals.setupTime)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-violet-300 mb-1">Run Time</p>
            <p className="text-2xl font-bold text-white">
              {formatDuration(grandTotals.runTime)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-violet-300 mb-1">Koszt całkowity</p>
            <p className="text-3xl font-bold text-green-400">
              {formatCost(grandTotals.cost)}
            </p>
          </div>
        </div>
      </div>

      {/* Order items list */}
      {orderItems.map((item) => {
        const isExpanded = expandedItems.has(item.id)
        const operations = item.operations || []

        return (
          <div
            key={item.id}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            {/* Item header (collapsible) */}
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{isExpanded ? '📂' : '📁'}</span>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.part_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ilość: {item.quantity} szt.
                    {item.material && ` • Materiał: ${item.material}`}
                    {item.complexity && ` • Złożoność: ${item.complexity}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Operacje</p>
                  <p className="text-lg font-bold text-foreground">
                    {operations.length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Czas</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatDuration((item.total_setup_time_minutes || 0) + (item.total_run_time_minutes || 0))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Koszt</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCost(item.total_cost || 0)}
                  </p>
                </div>
                <span className="text-slate-400">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {/* Operations list (expanded) */}
            {isExpanded && (
              <div className="px-6 pb-6 border-t border-border">
                {operations.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Brak operacji dla tej pozycji
                  </div>
                ) : (
                  <div className="space-y-3 mt-4">
                    {operations.map((operation) => {
                      const costs = calculateOperationCost(
                        operation.setup_time_minutes,
                        operation.run_time_per_unit_minutes,
                        item.quantity,
                        operation.hourly_rate
                      )

                      return (
                        <div
                          key={operation.id}
                          className="bg-muted p-4 rounded-lg border border-border"
                        >
                          {/* Operation header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              <span className="text-xl font-bold text-foreground">
                                #{operation.operation_number}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-base font-semibold text-foreground">
                                    {operation.operation_name}
                                  </h4>
                                  <span className="text-sm px-2 py-0.5 bg-violet-600 text-white rounded">
                                    {operationTypeLabels[operation.operation_type]}
                                  </span>
                                </div>
                                {operation.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {operation.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${operationStatusColors[operation.status]}`}>
                              {operationStatusLabels[operation.status]}
                            </span>
                          </div>

                          {/* Operation details grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Setup Time</p>
                              <p className="text-sm font-semibold text-foreground">
                                {formatDuration(operation.setup_time_minutes)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Run Time/szt</p>
                              <p className="text-sm font-semibold text-foreground">
                                {formatDuration(operation.run_time_per_unit_minutes)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Stawka</p>
                              <p className="text-sm font-semibold text-foreground">
                                {operation.hourly_rate} PLN/h
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Koszt</p>
                              <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                {formatCost(costs.totalCost)}
                              </p>
                            </div>
                          </div>

                          {/* Machine & operator info */}
                          {(operation.machine || operation.assigned_operator) && (
                            <div className="flex items-center gap-4 pt-3 border-t border-border">
                              {operation.machine && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">🔧 Maszyna:</span>
                                  <span className="text-foreground font-medium">
                                    {operation.machine.name}
                                  </span>
                                </div>
                              )}
                              {operation.assigned_operator && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">👤 Operator:</span>
                                  <span className="text-foreground font-medium">
                                    {operation.assigned_operator.full_name}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Time tracking */}
                          {(operation.started_at || operation.completed_at) && (
                            <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                              {operation.started_at && (
                                <p>Rozpoczęto: {new Date(operation.started_at).toLocaleString('pl-PL')}</p>
                              )}
                              {operation.completed_at && (
                                <p>Ukończono: {new Date(operation.completed_at).toLocaleString('pl-PL')}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Item summary footer */}
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Setup Time</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatDuration(item.total_setup_time_minutes || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Run Time</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatDuration(item.total_run_time_minutes || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Koszt pozycji</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCost(item.total_cost || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Info box */}
      <div className="bg-violet-900/20 border border-violet-700/50 rounded-lg p-4 text-sm text-violet-200">
        <p className="font-semibold mb-2">💡 Jak czytać strukturę operacyjną:</p>
        <ul className="list-disc list-inside space-y-1 text-violet-300 text-xs">
          <li><strong>Pozycje:</strong> Każda pozycja to osobny detal do wykonania (np. Flansza, Wałek)</li>
          <li><strong>Operacje:</strong> Kolejne kroki obróbki (#1, #2, #3...) tworzą routing produkcyjny</li>
          <li><strong>Setup Time:</strong> Czas przygotowania maszyny (jednorazowy)</li>
          <li><strong>Run Time:</strong> Czas obróbki jednej sztuki × ilość w pozycji</li>
          <li><strong>Koszt:</strong> Automatycznie obliczany na podstawie czasów i stawek</li>
        </ul>
      </div>
    </div>
  )
}
