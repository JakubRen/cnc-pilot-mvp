'use client'

import Link from 'next/link'

interface HistoryItem {
  id: string
  documentId: string
  documentType: 'PW' | 'RW' | 'WZ'
  documentNumber: string
  quantityChange: number
  quantityBefore: number
  quantityAfter: number
  changedAt: string
  notes: string | null
  changerName: string
}

interface Props {
  history: HistoryItem[]
  unit: string
}

export default function InventoryHistory({ history, unit }: Props) {
  if (history.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Historia Zmian</h2>
        <div className="text-center py-8">
          <p className="text-slate-400">
            Brak historii zmian. Historia pojawi się po zatwierdzeniu dokumentów magazynowych.
          </p>
        </div>
      </div>
    )
  }

  const getDocumentTypeColor = (type: 'PW' | 'RW' | 'WZ') => {
    switch (type) {
      case 'PW': return 'bg-green-600'
      case 'RW': return 'bg-blue-600'
      case 'WZ': return 'bg-orange-600'
      default: return 'bg-slate-600'
    }
  }

  const getDocumentTypeName = (type: 'PW' | 'RW' | 'WZ') => {
    switch (type) {
      case 'PW': return 'Przyjęcie'
      case 'RW': return 'Rozchód'
      case 'WZ': return 'Wydanie'
      default: return type
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Historia Zmian</h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700"></div>

        <div className="space-y-6">
          {history.map((item) => {
            const isPositive = item.quantityChange > 0
            const changeColor = isPositive ? 'text-green-400' : 'text-red-400'
            const changeIcon = isPositive ? '+' : ''

            return (
              <div key={item.id} className="relative pl-12">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-2 w-8 h-8 rounded-full ${getDocumentTypeColor(
                    item.documentType
                  )} flex items-center justify-center text-white text-xs font-bold shadow-lg`}
                >
                  {item.documentType}
                </div>

                <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 hover:border-slate-600 transition">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link
                        href={`/documents/${item.documentId}`}
                        className="text-blue-400 hover:text-blue-300 font-semibold transition"
                      >
                        {item.documentNumber}
                      </Link>
                      <p className="text-slate-400 text-sm mt-1">
                        {getDocumentTypeName(item.documentType)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 text-sm">
                        {new Date(item.changedAt).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(item.changedAt).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Change details */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Zmiana</p>
                      <p className={`text-lg font-bold ${changeColor}`}>
                        {changeIcon}
                        {item.quantityChange} {unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Stan przed</p>
                      <p className="text-white text-lg font-semibold">
                        {item.quantityBefore} {unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Stan po</p>
                      <p className="text-white text-lg font-semibold">
                        {item.quantityAfter} {unit}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center text-sm border-t border-slate-700 pt-3">
                    <p className="text-slate-400">
                      Zatwierdził: <span className="text-white">{item.changerName}</span>
                    </p>
                    {item.notes && (
                      <p className="text-slate-500 text-xs italic">&quot;{item.notes}&quot;</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
