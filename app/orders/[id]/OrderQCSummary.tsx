import Link from 'next/link'

interface QCMeasurement {
  id: string
  is_pass: boolean
}

interface Props {
  orderId: string
  orderStatus: string
  qcMeasurements: QCMeasurement[] | null
}

export default function OrderQCSummary({ orderId, orderStatus, qcMeasurements }: Props) {
  return (
    <div className="col-span-2 bg-card p-6 rounded-lg border border-border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <span>✅</span> Kontrola Jakości
        </h2>
        <div className="flex gap-2">
          {['in_progress', 'completed', 'ready_to_ship'].includes(orderStatus) && (
            <Link
              href={`/orders/${orderId}/qc`}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition font-semibold"
            >
              + Dodaj pomiar
            </Link>
          )}
        </div>
      </div>

      {!qcMeasurements || qcMeasurements.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📏</div>
          <p className="text-muted-foreground mb-2">Brak pomiarów dla tego zamówienia</p>
          <p className="text-muted-foreground text-sm">
            Kliknij &quot;Dodaj pomiar&quot; aby przejść do modułu kontroli jakości
          </p>
        </div>
      ) : (
        <div>
          {(() => {
            const totalMeasurements = qcMeasurements.length
            const passedCount = qcMeasurements.filter(m => m.is_pass).length
            const failedCount = totalMeasurements - passedCount
            const passRate = Math.round((passedCount / totalMeasurements) * 100)

            return (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <p className="text-muted-foreground text-xs">Pomiary</p>
                  <p className="text-2xl font-bold text-foreground">{totalMeasurements}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg text-center border border-green-200 dark:border-green-700/50">
                  <p className="text-muted-foreground text-xs">Zgodne</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{passedCount}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg text-center border border-red-200 dark:border-red-700/50">
                  <p className="text-muted-foreground text-xs">Niezgodne</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{failedCount}</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${passRate >= 95 ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50' : passRate >= 80 ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50'}`}>
                  <p className="text-muted-foreground text-xs">Zgodność</p>
                  <p className={`text-2xl font-bold ${passRate >= 95 ? 'text-green-600 dark:text-green-400' : passRate >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {passRate}%
                  </p>
                </div>
              </div>
            )
          })()}

          <div className="text-center">
            <Link
              href={`/orders/${orderId}/qc`}
              className="text-primary hover:underline text-sm font-semibold"
            >
              Zobacz pełną kontrolę jakości →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
