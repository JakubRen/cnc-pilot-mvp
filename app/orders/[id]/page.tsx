import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import StatusDropdown from './StatusDropdown'
import OrderTimeTracking from './OrderTimeTracking'
import TagSelect from '@/components/tags/TagSelect'
import GenerateClientLink from '@/components/client-portal/GenerateClientLink'
import OrderCostAnalysis from '@/components/orders/OrderCostAnalysis'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch order with creator and assigned operator info (join query)
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      creator:users!created_by (
        full_name,
        email
      ),
      assigned_operator:users!orders_assigned_operator_id_fkey (
        full_name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (error || !order) {
    notFound()
  }

  // Fetch time logs for this order
  const { data: timeLogs } = await supabase
    .from('time_logs')
    .select(`
      *,
      users (
        full_name
      )
    `)
    .eq('order_id', id)
    .order('start_time', { ascending: false })

  // Fetch tags for this order
  const { data: orderTags } = await supabase
    .from('entity_tags')
    .select(`
      tag_id,
      tags (
        id,
        name,
        color
      )
    `)
    .eq('entity_type', 'order')
    .eq('entity_id', id)

  // Fetch QC measurements for this order
  const { data: qcMeasurements } = await supabase
    .from('quality_measurements')
    .select(`
      *,
      quality_control_items (
        name,
        nominal_value,
        tolerance_plus,
        tolerance_minus,
        unit,
        is_critical
      ),
      quality_control_plans!inner (
        id,
        name
      ),
      users (
        full_name
      )
    `)
    .eq('order_id', id)
    .order('measured_at', { ascending: false })
    .limit(20)

  // Fetch drawing file if exists
  let drawingFile = null
  if (order.drawing_file_id) {
    const { data: file } = await supabase
      .from('files')
      .select('id, name, url, file_type, file_size')
      .eq('id', order.drawing_file_id)
      .single()

    drawingFile = file
  }

  // Fetch production plans for this order
  const { data: productionPlans } = await supabase
    .from('production_plans')
    .select(`
      id,
      plan_number,
      part_name,
      quantity,
      material,
      status,
      total_setup_time_minutes,
      total_run_time_minutes,
      estimated_cost,
      operations!inner (id, status)
    `)
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  // Transform tags data to flat array
  type TagRecord = { id: string; name: string; color: string }
  const tags = (orderTags || [])
    .map((et) => et.tags as unknown as TagRecord | null)
    .filter((tag): tag is TagRecord => tag !== null)

  // Format dates in Polish locale
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Status badge color
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-600',
      in_progress: 'bg-blue-600',
      completed: 'bg-green-600',
      delayed: 'bg-red-600',
      cancelled: 'bg-gray-600',
      ready_to_ship: 'bg-indigo-600',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-600'
  }

  // Check if order is overdue (deadline is today or in the past)
  const deadlineDate = new Date(order.deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to midnight for date-only comparison
  const isOverdue = deadlineDate <= today && order.status !== 'completed' && order.status !== 'cancelled'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Zamówienia', href: '/orders' },
            { label: `#${order.order_number}` },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Zamówienie #{order.order_number}</h1>
            <div className="flex gap-3 items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white uppercase ${getStatusColor(order.status)}`}>
                {order.status === 'pending' ? 'Oczekujące' : order.status === 'in_progress' ? 'W realizacji' : order.status === 'completed' ? 'Ukończone' : order.status === 'delayed' ? 'Opóźnione' : order.status === 'cancelled' ? 'Anulowane' : order.status === 'ready_to_ship' ? 'Do wysyłki' : order.status}
              </span>
              {isOverdue && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-white uppercase bg-red-700 animate-pulse">
                  ⚠️ PO TERMINIE
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <GenerateClientLink customerName={order.customer_name} />
            <Link
              href={`/orders/${id}/edit`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Edytuj
            </Link>
            <Link
              href="/orders"
              className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              Wróć do zamówień
            </Link>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Informacje o kliencie</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Nazwa klienta</p>
                <p className="text-slate-900 dark:text-white font-semibold text-lg">{order.customer_name}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Szczegóły zamówienia</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Nazwa części</p>
                <p className="text-slate-900 dark:text-white font-semibold">{order.part_name || 'Brak'}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Materiał</p>
                <p className="text-slate-900 dark:text-white font-semibold">{order.material || 'Brak'}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Ilość</p>
                <p className="text-slate-900 dark:text-white font-semibold">{order.quantity} szt</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Oś czasu</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Termin</p>
                <p className={`font-semibold text-lg ${isOverdue ? 'text-red-400' : 'text-slate-900 dark:text-white'}`}>
                  {formatDate(order.deadline)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Data utworzenia</p>
                <p className="text-slate-900 dark:text-white">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Ostatnia aktualizacja</p>
                <p className="text-slate-900 dark:text-white">{formatDate(order.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Creator Information */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Utworzone przez</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Imię i nazwisko</p>
                <p className="text-slate-900 dark:text-white font-semibold">{order.creator?.full_name || 'Nieznany'}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Email</p>
                <p className="text-slate-900 dark:text-white">{order.creator?.email || 'Brak'}</p>
              </div>
            </div>
          </div>

          {/* Technical Drawing */}
          {drawingFile && (
            <div className="col-span-2 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg border-2 border-blue-500/50">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">📐</span>
                Rysunek Techniczny
              </h2>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">
                      {drawingFile.name.toLowerCase().endsWith('.pdf') ? '📄' :
                       drawingFile.name.toLowerCase().endsWith('.dxf') ? '📐' : '🖼️'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {drawingFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(drawingFile.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <a
                    href={drawingFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-lg"
                  >
                    📱 Otwórz na tablecie →
                  </a>
                </div>

                {/* PDF Preview */}
                {drawingFile.name.toLowerCase().endsWith('.pdf') && (
                  <div className="mt-4">
                    <iframe
                      src={drawingFile.url}
                      className="w-full h-96 border border-slate-300 dark:border-slate-600 rounded-lg"
                      title="Podgląd rysunku PDF"
                    />
                  </div>
                )}

                {/* Image Preview */}
                {(drawingFile.file_type?.startsWith('image/') ||
                  drawingFile.name.toLowerCase().match(/\.(png|jpg|jpeg)$/)) && (
                  <div className="mt-4">
                    <img
                      src={drawingFile.url}
                      alt="Rysunek techniczny"
                      className="w-full h-auto border border-slate-300 dark:border-slate-600 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 italic">
                💡 Operator przy maszynie może otworzyć rysunek na tablecie przez przycisk powyżej
              </p>
            </div>
          )}

          {/* Production Plans */}
          <div className="col-span-2 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-lg border-2 border-green-500/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-2xl">⚙️</span>
                Plany Produkcji
              </h2>
              <Link
                href={`/production/create?order_id=${id}`}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-lg"
              >
                + Utwórz Plan Produkcji
              </Link>
            </div>

            {!productionPlans || productionPlans.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
                <div className="text-5xl mb-4">⚙️</div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Brak planów produkcji
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Utwórz plan produkcji z operacjami technologicznymi (Setup/Run Time, routing, przypisanie maszyn)
                </p>
                <Link
                  href={`/production/create?order_id=${id}`}
                  className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  + Utwórz Plan Produkcji
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {productionPlans.map((plan: any) => {
                  const operationsCount = plan.operations?.length || 0
                  const completedOps = plan.operations?.filter((op: any) => op.status === 'completed').length || 0
                  const completion = operationsCount > 0 ? Math.round((completedOps / operationsCount) * 100) : 0
                  const totalTime = (plan.total_setup_time_minutes || 0) + (plan.total_run_time_minutes || 0)

                  // Status colors
                  const statusColors: Record<string, string> = {
                    draft: 'bg-slate-600',
                    active: 'bg-blue-600',
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

                  return (
                    <Link
                      key={plan.id}
                      href={`/production/${plan.id}`}
                      className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-green-500 hover:shadow-lg transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {plan.part_name}
                            </h3>
                            <span className={`px-2 py-0.5 ${statusColors[plan.status] || 'bg-slate-600'} text-white text-xs font-semibold rounded`}>
                              {statusLabels[plan.status] || plan.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            📋 {plan.plan_number} • {plan.quantity} szt.
                            {plan.material && ` • ${plan.material}`}
                          </p>
                          {operationsCount > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${completion}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                  {completion}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {completedOps}/{operationsCount} operacji ukończonych
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-6 ml-6">
                          <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Operacje</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                              {operationsCount}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Czas</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                              {Math.floor(totalTime / 60)}h {totalTime % 60}m
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Koszt szac.</p>
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

          {/* Assigned Operator */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Przypisany operator</h2>
            <div className="space-y-3">
              {order.assigned_operator ? (
                <>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Imię i nazwisko</p>
                    <p className="text-slate-900 dark:text-white font-semibold">{order.assigned_operator.full_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Email</p>
                    <p className="text-slate-900 dark:text-white">{order.assigned_operator.email}</p>
                  </div>
                </>
              ) : (
                <p className="text-slate-400 dark:text-slate-500">Brak przypisanego operatora</p>
              )}
            </div>
          </div>

          {/* Quick Status Change */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Szybka zmiana statusu</h2>
            <StatusDropdown orderId={order.id} currentStatus={order.status} />
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Tagi</h2>
            <TagSelect
              entityType="order"
              entityId={order.id}
              selectedTags={tags}
            />
          </div>

          {/* COST ANALYSIS - Enhanced cost breakdown with profitability */}
          <div className="col-span-2">
            <OrderCostAnalysis
              orderId={order.id}
              quantity={order.quantity || 1}
              estimatedMaterialCost={order.estimated_material_cost || order.material_cost || 0}
              estimatedLaborCost={order.estimated_labor_cost || order.labor_cost || 0}
              estimatedOverheadCost={order.estimated_overhead_cost || order.overhead_cost || 0}
              estimatedHours={order.estimated_hours || null}
              materialCost={order.material_cost || 0}
              laborCost={order.labor_cost || 0}
              overheadCost={order.overhead_cost || 0}
              totalCost={order.total_cost || 0}
              sellingPrice={order.selling_price || 0}
              marginPercent={order.margin_percent || 0}
              timeLogs={timeLogs || []}
            />
          </div>

          {/* Notes (Full Width if exists) */}
          {order.notes && (
            <div className="col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Notatki</h2>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {/* Time Tracking Section (Full Width) */}
          <div className="col-span-2">
            <OrderTimeTracking
              orderId={order.id}
              orderNumber={order.order_number}
              estimatedHours={order.estimated_hours}
              timeLogs={timeLogs || []}
              currentUserId={user.id}
              companyId={user.company_id}
              hourlyRate={user.hourly_rate || 150}
            />
          </div>

          {/* Quality Control Section (Full Width) */}
          <div className="col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>✅</span> Kontrola Jakości
              </h2>
              <div className="flex gap-2">
                {['in_progress', 'completed'].includes(order.status) && (
                  <Link
                    href={`/reports/quality-control/plans/add?order_id=${id}`}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                  >
                    + Dodaj pomiar
                  </Link>
                )}
                <Link
                  href="/reports/quality-control"
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                >
                  Zobacz raport QC
                </Link>
              </div>
            </div>

            {!qcMeasurements || qcMeasurements.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">📏</div>
                <p className="text-slate-500 dark:text-slate-400 mb-2">Brak pomiarów dla tego zamówienia</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm">
                  Pomiary zostaną wyświetlone tutaj po dodaniu ich w module Kontroli Jakości
                </p>
              </div>
            ) : (
              <div>
                {/* QC Stats */}
                {(() => {
                  const totalMeasurements = qcMeasurements.length
                  const passedCount = qcMeasurements.filter(m => m.is_pass).length
                  const failedCount = totalMeasurements - passedCount
                  const passRate = Math.round((passedCount / totalMeasurements) * 100)

                  return (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Pomiary</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalMeasurements}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg text-center border border-green-200 dark:border-green-700/50">
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Zgodne</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{passedCount}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg text-center border border-red-200 dark:border-red-700/50">
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Niezgodne</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{failedCount}</p>
                      </div>
                      <div className={`p-3 rounded-lg text-center ${passRate >= 95 ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50' : passRate >= 80 ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50'}`}>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Zgodność</p>
                        <p className={`text-2xl font-bold ${passRate >= 95 ? 'text-green-600 dark:text-green-400' : passRate >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                          {passRate}%
                        </p>
                      </div>
                    </div>
                  )
                })()}

                {/* Measurements Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Wymiar</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Nominał</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Pomiar</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Wynik</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Operator</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {qcMeasurements.slice(0, 10).map((measurement) => {
                        const item = measurement.quality_control_items
                        return (
                          <tr key={measurement.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-900 dark:text-white text-sm">{item?.name || '-'}</span>
                                {item?.is_critical && (
                                  <span className="px-1.5 py-0.5 bg-red-600/30 text-red-400 text-[10px] rounded">
                                    KRYT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm font-mono">
                              {item?.nominal_value} ±{Math.max(item?.tolerance_plus || 0, item?.tolerance_minus || 0)} {item?.unit}
                            </td>
                            <td className="px-4 py-2 text-slate-900 dark:text-white text-sm font-mono font-semibold">
                              {measurement.measured_value} {item?.unit}
                            </td>
                            <td className="px-4 py-2">
                              {measurement.is_pass ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                  <span>✓</span> OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                  <span>✕</span> NOK
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm">
                              {measurement.users?.full_name || '-'}
                            </td>
                            <td className="px-4 py-2 text-slate-400 dark:text-slate-500 text-xs">
                              {new Date(measurement.measured_at).toLocaleString('pl-PL', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {qcMeasurements.length > 10 && (
                  <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-4">
                    Wyświetlono 10 z {qcMeasurements.length} pomiarów
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Carbon Footprint Section (Full Width) */}
          {order.status === 'completed' && (
            <div className="col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🌿</span> Ślad Węglowy
                </h2>
                <Link
                  href={`/reports/carbon?order_id=${id}`}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                >
                  Oblicz emisje CO2
                </Link>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Oblicz ślad węglowy dla tego zamówienia w module raportów CO₂.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
