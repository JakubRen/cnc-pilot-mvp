'use client'

import type { Measurement } from './OrderQCClient'

interface Props {
  measurements: Measurement[]
}

export default function QCMeasurementsList({ measurements }: Props) {
  if (measurements.length === 0) return null

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Historia pomiarów</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">Wymiar</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">Nominał</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">Pomiar</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">Wynik</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">Plan</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">Operator</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {measurements.slice(0, 20).map((m) => {
              const item = m.quality_control_items
              return (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-sm">{item?.name || '-'}</span>
                      {item?.is_critical && (
                        <span className="px-1.5 py-0.5 bg-red-600/30 text-red-600 dark:text-red-400 text-[10px] rounded">KRYT</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-sm font-mono">
                    {item?.nominal_value} ±{Math.max(item?.tolerance_plus || 0, item?.tolerance_minus || 0)} {item?.unit}
                  </td>
                  <td className="px-4 py-2 text-foreground text-sm font-mono font-semibold">
                    {m.measured_value} {item?.unit}
                  </td>
                  <td className="px-4 py-2">
                    {m.is_pass ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded-full">✓ OK</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-full">✕ NOK</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {m.quality_control_plans?.name || '-'}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-sm">
                    {m.users?.full_name || '-'}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {new Date(m.measured_at).toLocaleString('pl-PL', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {measurements.length > 20 && (
        <p className="text-center text-muted-foreground text-sm py-3">
          Wyświetlono 20 z {measurements.length} pomiarów
        </p>
      )}
    </div>
  )
}
