import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { formatCost, formatDuration, operationTypeLabels, operationStatusLabels, operationStatusColors, Operation } from '@/types/operations'

export default async function ProductionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch production order (order_item) with operations
  const { data: productionOrder } = await supabase
    .from('order_items')
    .select(`
      *,
      order:orders!order_items_order_id_fkey (
        id,
        order_number,
        customer_name,
        deadline,
        status,
        company_id
      ),
      operations (
        *,
        machine:machines (
          id,
          name,
          machine_type
        ),
        assigned_operator:users!operations_assigned_operator_id_fkey (
          id,
          full_name
        )
      ),
      drawing_file:drawing_files (
        id,
        file_name,
        file_url
      )
    `)
    .eq('id', id)
    .single()

  if (!productionOrder) {
    redirect('/production')
  }

  // Verify company_id
  const order = Array.isArray(productionOrder.order) ? productionOrder.order[0] : productionOrder.order
  if (order?.company_id !== user.company_id) {
    redirect('/production')
  }

  const operations = productionOrder.operations || []
  const totalSetupTime = productionOrder.total_setup_time_minutes || 0
  const totalRunTime = productionOrder.total_run_time_minutes || 0
  const totalCost = productionOrder.total_cost || 0

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              ⚙️ Plan Produkcji
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {productionOrder.part_name} • {productionOrder.quantity} szt.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/orders/${order?.id}`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              📦 Zlecenie #{order?.order_number}
            </Link>
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
                'bg-yellow-600'
              }`}>
                {order?.status}
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
              <p className="text-slate-900 dark:text-white font-semibold">{productionOrder.part_name}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Ilość</p>
              <p className="text-slate-900 dark:text-white font-semibold">{productionOrder.quantity} szt.</p>
            </div>
            {productionOrder.material && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Materiał</p>
                <p className="text-slate-900 dark:text-white font-semibold">{productionOrder.material}</p>
              </div>
            )}
            {productionOrder.complexity && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Złożoność</p>
                <p className="text-slate-900 dark:text-white font-semibold">{productionOrder.complexity}</p>
              </div>
            )}
            {productionOrder.drawing_file && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Rysunek</p>
                <a
                  href={productionOrder.drawing_file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  📐 {productionOrder.drawing_file.file_name}
                </a>
              </div>
            )}
          </div>
          {productionOrder.notes && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Notatki technologiczne</p>
              <p className="text-slate-900 dark:text-white">{productionOrder.notes}</p>
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

        {/* Operations List */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">🔄 Routing Produkcyjny</h2>

          {operations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 dark:text-slate-400 mb-4">Brak operacji w planie produkcji</p>
            </div>
          ) : (
            <div className="space-y-4">
              {operations
                .sort((a: Operation, b: Operation) => a.operation_number - b.operation_number)
                .map((operation: Operation) => {
                  const machine = Array.isArray(operation.machine) ? operation.machine[0] : operation.machine
                  const operator = Array.isArray(operation.assigned_operator)
                    ? operation.assigned_operator[0]
                    : operation.assigned_operator

                  return (
                    <div
                      key={operation.id}
                      className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      {/* Operation Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full font-bold text-xl">
                            #{operation.operation_number}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {operation.operation_name}
                              </h3>
                              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-sm font-semibold rounded">
                                {operationTypeLabels[operation.operation_type]}
                              </span>
                            </div>
                            {operation.description && (
                              <p className="text-slate-600 dark:text-slate-400">{operation.description}</p>
                            )}
                          </div>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold text-white ${operationStatusColors[operation.status]}`}>
                          {operationStatusLabels[operation.status]}
                        </span>
                      </div>

                      {/* Operation Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Setup Time</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {formatDuration(operation.setup_time_minutes)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Run Time/szt</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {formatDuration(operation.run_time_per_unit_minutes)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Stawka</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {operation.hourly_rate} PLN/h
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Koszt setup</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatCost((operation.setup_time_minutes / 60) * operation.hourly_rate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Koszt run</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatCost((operation.run_time_per_unit_minutes * productionOrder.quantity / 60) * operation.hourly_rate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Koszt całkowity</p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            {formatCost(operation.total_operation_cost || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Machine & Operator Info */}
                      {(machine || operator) && (
                        <div className="flex gap-6 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          {machine && (
                            <div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Maszyna</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                🔧 {machine.name} ({machine.machine_type})
                              </p>
                            </div>
                          )}
                          {operator && (
                            <div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Operator</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
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
        </div>
      </div>
    </AppLayout>
  )
}
