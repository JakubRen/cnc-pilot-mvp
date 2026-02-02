import Link from 'next/link'

interface ProductionPlan {
  id: string
  plan_number: string
  part_name: string
  quantity: number
  material: string | null
  status: string
  total_setup_time_minutes: number | null
  total_run_time_minutes: number | null
  estimated_cost: number | null
  operations: { id: string; status: string }[]
}

interface Props {
  orderId: string
  productionPlans: ProductionPlan[] | null
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-600',
  active: 'bg-violet-600',
  in_progress: 'bg-purple-600',
  completed: 'bg-green-600',
  cancelled: 'bg-gray-600',
}

const statusLabels: Record<string, string> = {
  draft: 'Szkic',
  active: 'Aktywny',
  in_progress: 'W Realizacji',
  completed: 'Ukończony',
  cancelled: 'Anulowany',
}

export default function OrderProductionPlans({ orderId, productionPlans }: Props) {
  return (
    <div className="col-span-2 bg-gradient-to-br from-green-50 to-violet-50 dark:from-green-900/20 dark:to-violet-900/20 p-6 rounded-lg border-2 border-green-500/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          Plany Produkcji
        </h2>
        <Link
          href={`/production/create?order_id=${orderId}`}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-lg"
        >
          + Utwórz Plan Produkcji
        </Link>
      </div>

      {!productionPlans || productionPlans.length === 0 ? (
        <div className="bg-card rounded-lg border-2 border-dashed border-border p-8 text-center">
          <div className="text-5xl mb-4">⚙️</div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            Brak planów produkcji
          </h3>
          <p className="text-muted-foreground mb-4">
            Utwórz plan produkcji z operacjami technologicznymi (Setup/Run Time, routing, przypisanie maszyn)
          </p>
          <Link
            href={`/production/create?order_id=${orderId}`}
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            + Utwórz Plan Produkcji
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {productionPlans.map((plan) => {
            const operationsCount = plan.operations?.length || 0
            const completedOps = plan.operations?.filter((op) => op.status === 'completed').length || 0
            const completion = operationsCount > 0 ? Math.round((completedOps / operationsCount) * 100) : 0
            const totalTime = (plan.total_setup_time_minutes || 0) + (plan.total_run_time_minutes || 0)

            return (
              <Link
                key={plan.id}
                href={`/production/${plan.id}`}
                className="block bg-card border border-border rounded-lg p-4 hover:border-green-500 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-foreground">
                        {plan.part_name}
                      </h3>
                      <span className={`px-2 py-0.5 ${statusColors[plan.status] || 'bg-slate-600'} text-white text-xs font-semibold rounded`}>
                        {statusLabels[plan.status] || plan.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      📋 {plan.plan_number} • {plan.quantity} szt.
                      {plan.material && ` • ${plan.material}`}
                    </p>
                    {operationsCount > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-semibold">
                            {completion}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {completedOps}/{operationsCount} operacji ukończonych
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-6 ml-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Operacje</p>
                      <p className="text-lg font-bold text-foreground">
                        {operationsCount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Czas</p>
                      <p className="text-lg font-bold text-foreground">
                        {Math.floor(totalTime / 60)}h {totalTime % 60}m
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Koszt szac.</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {(plan.estimated_cost || 0).toFixed(2)} PLN
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
