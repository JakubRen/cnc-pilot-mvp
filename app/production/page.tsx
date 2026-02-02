import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { ProductionPlanWithRelations, productionPlanStatusLabels, productionPlanStatusColors, getCompletionPercentage, getPriorityLabel, getPriorityColor } from '@/types/production-plans'

export default async function ProductionPage() {
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch all production plans with their relations
  const { data: productionPlans } = await supabase
    .from('production_plans')
    .select(`
      *,
      order:orders (
        id,
        order_number,
        customer_name,
        deadline,
        status
      ),
      operations (
        id,
        status,
        operation_number
      )
    `)
    .eq('company_id', user.company_id)
    .order('created_at', { ascending: false })

  // DEBUG: Log production plans for E2E test troubleshooting
  console.error('[Production List] Fetched plans:', {
    count: productionPlans?.length || 0,
    plans: productionPlans?.map(p => ({
      id: p.id,
      part_name: p.part_name,
      plan_number: p.plan_number,
      order_id: p.order_id,
      has_order_data: !!p.order
    }))
  })

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              ⚙️ Plan Produkcji
            </h1>
            <p className="text-muted-foreground">
              Operacje technologiczne • Routing produkcyjny • Setup/Run Time
            </p>
          </div>
        </div>

        {/* Production Plans List */}
        {!productionPlans || productionPlans.length === 0 ? (
          <div className="bg-card rounded-lg border-2 border-dashed border-border p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Brak planów produkcji
            </h2>
            <p className="text-muted-foreground mb-6">
              Plany produkcji tworzy się z poziomu zleceń.
            </p>
            <Link
              href="/orders"
              className="inline-block px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
            >
              Przejdź do Zleceń
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {productionPlans.map((plan: any) => {
              const typedPlan = plan as ProductionPlanWithRelations
              const order = Array.isArray(typedPlan.order) ? typedPlan.order[0] : typedPlan.order
              const operationsCount = typedPlan.operations?.length || 0
              const completedOps = typedPlan.operations?.filter((op) => op.status === 'completed').length || 0
              const completion = getCompletionPercentage(typedPlan)
              const priority = getPriorityLabel(typedPlan)
              const priorityColor = getPriorityColor(typedPlan)

              return (
                <Link
                  key={typedPlan.id}
                  href={`/production/${typedPlan.id}`}
                  className="block bg-card border border-border rounded-lg p-6 hover:border-violet-500 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-foreground">
                          {typedPlan.part_name}
                        </h3>
                        <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-100 text-xs font-semibold rounded">
                          {typedPlan.quantity} szt.
                        </span>
                        <span className={`px-2 py-1 ${productionPlanStatusColors[typedPlan.status]} text-white text-xs font-semibold rounded`}>
                          {productionPlanStatusLabels[typedPlan.status]}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${priorityColor}`}>
                          {priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>📋 {typedPlan.plan_number}</span>
                        {order && <span>📦 {order.order_number}</span>}
                        {order && <span>👤 {order.customer_name}</span>}
                        {typedPlan.material && <span>🔩 {typedPlan.material}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Postęp</p>
                      <p className="text-lg font-bold text-foreground">
                        {completion}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {completedOps}/{operationsCount} op
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Setup Time</p>
                      <p className="text-lg font-bold text-foreground">
                        {Math.floor(typedPlan.total_setup_time_minutes || 0)} min
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Run Time</p>
                      <p className="text-lg font-bold text-foreground">
                        {Math.floor(typedPlan.total_run_time_minutes || 0)} min
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Koszt szac.</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {typedPlan.estimated_cost?.toFixed(2) || '0.00'} PLN
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
        </div>
      </div>
    </AppLayout>
  )
}
