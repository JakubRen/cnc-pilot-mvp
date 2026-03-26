import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import StatusDropdown from './StatusDropdown'
import DrawingButton from './DrawingButton'
import OrderDetailsTabs from './OrderDetailsTabs'
import GenerateClientLink from '@/components/client-portal/GenerateClientLink'
import DuplicateButton from './DuplicateButton'
import OrderPdfButton from './OrderPdfButton'
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

  // Fetch QC measurements for this order (including Quick Measure without plan)
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
      quality_control_plans (
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
      <div className="max-w-5xl mx-auto">
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-10 bg-background pb-4 border-b border-border mb-6">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: 'Pulpit', href: '/' },
              { label: 'Zamówienia', href: '/orders' },
              { label: `#${order.order_number}` },
            ]}
            className="mb-4"
          />

          {/* Header Row */}
          <div className="flex justify-between items-start">
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
              <OrderPdfButton orderId={id} orderNumber={order.order_number} />
              <GenerateClientLink customerName={order.customer_name} />
              <DrawingButton drawingFile={drawingFile} />
              <DuplicateButton orderId={id} orderNumber={order.order_number} />
              <Link
                href={`/orders/${id}/edit`}
                className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition font-semibold"
              >
                Edytuj
              </Link>
              <Link
                href="/orders"
                className="px-4 py-2 text-sm rounded-lg bg-muted text-foreground hover:bg-accent transition"
              >
                Wróć
              </Link>
            </div>
          </div>

          {/* Quick Status Change */}
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Status:</span>
            <StatusDropdown orderId={order.id} currentStatus={order.status} />
          </div>
        </div>

        {/* TABS CONTENT */}
        <OrderDetailsTabs
          order={order}
          orderItems={orderItems || []}
          timeLogs={timeLogs || []}
          productionPlans={productionPlans || []}
          qcMeasurements={qcMeasurements || []}
          currentUserId={user.id}
          companyId={user.company_id}
          hourlyRate={user.hourly_rate || 150}
          isOverdue={isOverdue}
        />
      </div>
    </div>
  )
}
