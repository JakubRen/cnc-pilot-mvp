import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { formatCost, formatDuration, operationTypeLabels, operationStatusLabels, operationStatusColors, Operation } from '@/types/operations'
import { ProductionPlanWithRelations, productionPlanStatusLabels, productionPlanStatusColors } from '@/types/production-plans'
import ProductionExecutionClient from './ProductionExecutionClient'

export default async function ProductionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch production plan with separate queries to avoid complex JOIN issues
  // Previous approach with nested JOINs was failing silently in some environments
  const { data: productionPlan } = await supabase
    .from('production_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!productionPlan) {
    redirect('/production')
  }

  // Verify company_id before proceeding
  if (productionPlan.company_id !== user.company_id) {
    redirect('/production')
  }

  // Fetch order data separately if order_id exists
  let orderData = null
  if (productionPlan.order_id) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, deadline, status, company_id')
      .eq('id', productionPlan.order_id)
      .single()
    orderData = order
  }

  // Fetch operations separately
  const { data: ops } = await supabase
    .from('operations')
    .select('*')
    .eq('production_plan_id', id)
  const operationsData = ops || []

  // Attach relations to productionPlan for consistent type usage
  ;(productionPlan as Record<string, unknown>).order = orderData
  ;(productionPlan as Record<string, unknown>).operations = operationsData

  const typedPlan = productionPlan as ProductionPlanWithRelations

  // Extract order_id from raw data - TypeScript type cast may hide it
  const orderIdFromRawData = (productionPlan as Record<string, unknown>)?.order_id as string | null

  const order = Array.isArray(typedPlan.order) ? typedPlan.order[0] : typedPlan.order
  const operations = typedPlan.operations || []
  const totalSetupTime = typedPlan.total_setup_time_minutes || 0
  const totalRunTime = typedPlan.total_run_time_minutes || 0
  const totalCost = typedPlan.estimated_cost || 0

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              ⚙️ Plan Produkcji {typedPlan.plan_number}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {typedPlan.part_name} • {typedPlan.quantity} szt.
            </p>
          </div>
          <div className="flex gap-3">
            {/* ALWAYS show link if order_id exists - even if JOIN failed */}
            {/* Use orderIdFromRawData to bypass TypeScript type hiding */}
            {(orderIdFromRawData || order?.id) && (
              <Link
                href={`/orders/${orderIdFromRawData || order?.id}`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                📦 Zlecenie {order?.order_number ? `#${order.order_number}` : ''}
              </Link>
            )}
            <Link
              href="/production"
              className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              Powrót
            </Link>
          </div>
        </div>

        {/* Order Info Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">📋 Informacje o zleceniu</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Zlecenie</p>
              <p className="text-slate-900 dark:text-white font-semibold">#{order?.order_number}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Klient</p>
              <p className="text-slate-900 dark:text-white font-semibold">{order?.customer_name}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Termin</p>
              <p className="text-slate-900 dark:text-white font-semibold">
                {order?.deadline ? new Date(order.deadline).toLocaleDateString('pl-PL') : 'Brak'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Status zlecenia</p>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                order?.status === 'completed' ? 'bg-green-600' :
                order?.status === 'in_progress' ? 'bg-blue-600' :
                order?.status === 'delayed' ? 'bg-red-600' :
                order?.status === 'cancelled' ? 'bg-gray-600' :
                order?.status === 'ready_to_ship' ? 'bg-indigo-600' :
                'bg-yellow-600'
              }`}>
                {order?.status === 'ready_to_ship' ? 'Do wysyłki' : order?.status}
              </span>
            </div>
          </div>
        </div>

        {/* Production Details Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">🔧 Szczegóły produkcji</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Część</p>
              <p className="text-slate-900 dark:text-white font-semibold">{typedPlan.part_name}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Ilość</p>
              <p className="text-slate-900 dark:text-white font-semibold">{typedPlan.quantity} szt.</p>
            </div>
            {typedPlan.material && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Materiał</p>
                <p className="text-slate-900 dark:text-white font-semibold">{typedPlan.material}</p>
              </div>
            )}
            {(typedPlan.length || typedPlan.width || typedPlan.height) && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Wymiary</p>
                <p className="text-slate-900 dark:text-white font-semibold">
                  {typedPlan.length && `${typedPlan.length}mm`}
                  {typedPlan.width && ` × ${typedPlan.width}mm`}
                  {typedPlan.height && ` × ${typedPlan.height}mm`}
                </p>
              </div>
            )}
            {/* Drawing file section removed - files table may not exist in TEST */}
          </div>
          {typedPlan.technical_notes && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Notatki technologiczne</p>
              <p className="text-slate-900 dark:text-white">{typedPlan.technical_notes}</p>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-2 border-blue-500/50 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">📊 Podsumowanie</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-blue-300 mb-1">Operacje</p>
              <p className="text-3xl font-bold text-white">{operations.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-300 mb-1">Setup Time</p>
              <p className="text-3xl font-bold text-white">{formatDuration(totalSetupTime)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-300 mb-1">Run Time</p>
              <p className="text-3xl font-bold text-white">{formatDuration(totalRunTime)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-300 mb-1">Koszt całkowity</p>
              <p className="text-4xl font-bold text-green-400">{formatCost(totalCost)}</p>
            </div>
          </div>
        </div>

        {/* Operations List - Interactive */}
        <ProductionExecutionClient
          planId={id}
          orderId={orderIdFromRawData || order?.id || null}
          operations={operationsData}
          planStatus={typedPlan.status}
          quantity={typedPlan.quantity}
          currentUserId={user.id}
          companyId={user.company_id}
          hourlyRate={user.hourly_rate || 150}
        />
        </div>
      </div>
    </AppLayout>
  )
}
