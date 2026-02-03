import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import StatusDropdown from './StatusDropdown'
import OrderTimeTracking from './OrderTimeTracking'
import OrderProductionPlans from './OrderProductionPlans'
import OrderQCSummary from './OrderQCSummary'
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

  // Fetch order_items for this order
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true })

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
      in_progress: 'bg-violet-600',
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
    <div className="min-h-screen bg-background p-8">
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Zamówienie #{order.order_number}</h1>
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
              className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
            >
              Edytuj
            </Link>
            <Link
              href="/orders"
              className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-accent transition"
            >
              Wróć do zamówień
            </Link>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Informacje o kliencie</h2>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-sm">Nazwa klienta</p>
                <p className="text-foreground font-semibold text-lg">{order.customer_name}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Szczegóły zamówienia</h2>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-sm">Nazwa części</p>
                <p className="text-foreground font-semibold">{order.part_name || 'Brak'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Materiał</p>
                <p className="text-foreground font-semibold">{order.material || 'Brak'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Ilość</p>
                <p className="text-foreground font-semibold">{order.quantity} szt</p>
              </div>
            </div>
          </div>

          {/* Order Items (multi-item) */}
          {orderItems && orderItems.length > 0 && (
            <div className="col-span-2 bg-card p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Pozycje zamowienia ({orderItems.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nazwa</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Material</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Ilosc</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Wymiary (mm)</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Tolerancje</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Zlozonosc</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Notatki</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item: any, idx: number) => (
                      <tr key={item.id} className="border-b border-slate-100/50">
                        <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-3 text-foreground font-medium">{item.part_name}</td>
                        <td className="py-2 px-3 text-foreground">{item.material || '-'}</td>
                        <td className="py-2 px-3 text-right text-foreground font-semibold">{item.quantity} szt</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {item.length || item.width || item.height
                            ? `${item.length || '-'} x ${item.width || '-'} x ${item.height || '-'}`
                            : '-'}
                        </td>
                        <td className="py-2 px-3 text-violet-500 text-xs">
                          {item.tolerance_length || item.tolerance_width || item.tolerance_height
                            ? `±${item.tolerance_length ?? 0.1} / ±${item.tolerance_width ?? 0.1} / ±${item.tolerance_height ?? 0.1}`
                            : '±0.1'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {item.complexity === 'simple' ? 'Prosty' : item.complexity === 'medium' ? 'Sredni' : item.complexity === 'complex' ? 'Zlozony' : '-'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Oś czasu</h2>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-sm">Termin</p>
                <p className={`font-semibold text-lg ${isOverdue ? 'text-red-400' : 'text-foreground'}`}>
                  {formatDate(order.deadline)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Data utworzenia</p>
                <p className="text-foreground">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Ostatnia aktualizacja</p>
                <p className="text-foreground">{formatDate(order.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Creator Information */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Utworzone przez</h2>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-sm">Imię i nazwisko</p>
                <p className="text-foreground font-semibold">{order.creator?.full_name || 'Nieznany'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Email</p>
                <p className="text-foreground">{order.creator?.email || 'Brak'}</p>
              </div>
            </div>
          </div>

          {/* Technical Drawing */}
          {drawingFile && (
            <div className="col-span-2 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-6 rounded-lg border-2 border-violet-500/50">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">📐</span>
                Rysunek Techniczny
              </h2>
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">
                      {drawingFile.name.toLowerCase().endsWith('.pdf') ? '📄' :
                       drawingFile.name.toLowerCase().endsWith('.dxf') ? '📐' : '🖼️'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {drawingFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(drawingFile.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <a
                    href={drawingFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold shadow-lg"
                  >
                    📱 Otwórz na tablecie →
                  </a>
                </div>

                {/* PDF Preview */}
                {drawingFile.name.toLowerCase().endsWith('.pdf') && (
                  <div className="mt-4">
                    <iframe
                      src={drawingFile.url}
                      className="w-full h-96 border border-border rounded-lg"
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
                      className="w-full h-auto border border-border rounded-lg"
                    />
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-3 italic">
                💡 Operator przy maszynie może otworzyć rysunek na tablecie przez przycisk powyżej
              </p>
            </div>
          )}

          {/* Production Plans */}
          <OrderProductionPlans orderId={id} productionPlans={productionPlans as any} />

          {/* Assigned Operator */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Przypisany operator</h2>
            <div className="space-y-3">
              {order.assigned_operator ? (
                <>
                  <div>
                    <p className="text-muted-foreground text-sm">Imię i nazwisko</p>
                    <p className="text-foreground font-semibold">{order.assigned_operator.full_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Email</p>
                    <p className="text-foreground">{order.assigned_operator.email}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Brak przypisanego operatora</p>
              )}
            </div>
          </div>

          {/* Quick Status Change */}
          <div className="bg-card p-6 rounded-lg border border-violet-200 dark:border-violet-700">
            <h2 className="text-xl font-semibold text-foreground mb-4">Szybka zmiana statusu</h2>
            <StatusDropdown orderId={order.id} currentStatus={order.status} />
          </div>

          {/* Tags */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Tagi</h2>
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
            <div className="col-span-2 bg-card p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Notatki</h2>
              <p className="text-foreground whitespace-pre-wrap">{order.notes}</p>
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
          <OrderQCSummary
            orderId={id}
            orderStatus={order.status}
            qcMeasurements={qcMeasurements}
            orderItems={orderItems as any}
            companyId={user.company_id}
            userId={user.id}
          />
          {/* Carbon Footprint Section (Full Width) */}
          {(order.status === 'completed' || order.status === 'ready_to_ship') && (
            <div className="col-span-2 bg-card p-6 rounded-lg border border-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <span>🌿</span> Ślad Węglowy
                </h2>
                <Link
                  href={`/reports/carbon?order_id=${id}`}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                >
                  Oblicz emisje CO2
                </Link>
              </div>
              <p className="text-muted-foreground text-sm">
                Oblicz ślad węglowy dla tego zamówienia w module raportów CO₂.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
