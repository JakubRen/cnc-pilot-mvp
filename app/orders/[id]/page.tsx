import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import StatusDropdown from './StatusDropdown'
import OrderTimeTracking from './OrderTimeTracking'
import TagSelect from '@/components/tags/TagSelect'

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
    }
    return colors[status as keyof typeof colors] || 'bg-gray-600'
  }

  // Check if order is overdue (deadline is today or in the past)
  const deadlineDate = new Date(order.deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to midnight for date-only comparison
  const isOverdue = deadlineDate <= today && order.status !== 'completed' && order.status !== 'cancelled'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Zamówienie #{order.order_number}</h1>
            <div className="flex gap-3 items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white uppercase ${getStatusColor(order.status)}`}>
                {order.status === 'pending' ? 'Oczekujące' : order.status === 'in_progress' ? 'W realizacji' : order.status === 'completed' ? 'Ukończone' : order.status === 'delayed' ? 'Opóźnione' : order.status === 'cancelled' ? 'Anulowane' : order.status}
              </span>
              {isOverdue && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-white uppercase bg-red-700 animate-pulse">
                  ⚠️ PO TERMINIE
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/orders/${id}/edit`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Edytuj
            </Link>
            <Link
              href="/orders"
              className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
            >
              Wróć do zamówień
            </Link>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Informacje o kliencie</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Nazwa klienta</p>
                <p className="text-white font-semibold text-lg">{order.customer_name}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Szczegóły zamówienia</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Nazwa części</p>
                <p className="text-white font-semibold">{order.part_name || 'Brak'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Materiał</p>
                <p className="text-white font-semibold">{order.material || 'Brak'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Ilość</p>
                <p className="text-white font-semibold">{order.quantity} szt</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Oś czasu</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Termin</p>
                <p className={`font-semibold text-lg ${isOverdue ? 'text-red-400' : 'text-white'}`}>
                  {formatDate(order.deadline)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Data utworzenia</p>
                <p className="text-white">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Ostatnia aktualizacja</p>
                <p className="text-white">{formatDate(order.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Creator Information */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Utworzone przez</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Imię i nazwisko</p>
                <p className="text-white font-semibold">{order.creator?.full_name || 'Nieznany'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Email</p>
                <p className="text-white">{order.creator?.email || 'Brak'}</p>
              </div>
            </div>
          </div>

          {/* Assigned Operator */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Przypisany operator</h2>
            <div className="space-y-3">
              {order.assigned_operator ? (
                <>
                  <div>
                    <p className="text-slate-400 text-sm">Imię i nazwisko</p>
                    <p className="text-white font-semibold">{order.assigned_operator.full_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Email</p>
                    <p className="text-white">{order.assigned_operator.email}</p>
                  </div>
                </>
              ) : (
                <p className="text-slate-500">Brak przypisanego operatora</p>
              )}
            </div>
          </div>

          {/* Quick Status Change */}
          <div className="bg-slate-800 p-6 rounded-lg border border-blue-700">
            <h2 className="text-xl font-semibold text-white mb-4">Szybka zmiana statusu</h2>
            <StatusDropdown orderId={order.id} currentStatus={order.status} />
          </div>

          {/* Tags */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Tagi</h2>
            <TagSelect
              entityType="order"
              entityId={order.id}
              selectedTags={tags}
            />
          </div>

          {/* DAY 12: COST BREAKDOWN - Show only if total_cost > 0 */}
          {order.total_cost && order.total_cost > 0 && (
            <div className="col-span-2 bg-gradient-to-br from-green-900/20 to-slate-800 p-6 rounded-lg border border-green-700/50">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>💰</span> Podział kosztów
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Material Cost */}
                {order.material_cost > 0 && (
                  <div className="bg-slate-800/50 p-4 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Koszt Materiału</p>
                    <p className="text-white font-bold text-xl">{order.material_cost.toFixed(2)} PLN</p>
                  </div>
                )}

                {/* Labor Cost */}
                {order.labor_cost > 0 && (
                  <div className="bg-slate-800/50 p-4 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Koszt Pracy</p>
                    <p className="text-white font-bold text-xl">{order.labor_cost.toFixed(2)} PLN</p>
                  </div>
                )}

                {/* Overhead Cost */}
                {order.overhead_cost > 0 && (
                  <div className="bg-slate-800/50 p-4 rounded-lg">
                    <p className="text-slate-400 text-sm mb-1">Koszty Ogólne</p>
                    <p className="text-white font-bold text-xl">{order.overhead_cost.toFixed(2)} PLN</p>
                  </div>
                )}

                {/* Total Cost - Always show if total_cost > 0 */}
                <div className="bg-green-900/30 p-4 rounded-lg border-2 border-green-600">
                  <p className="text-green-300 text-sm mb-1 font-semibold">ŁĄCZNY KOSZT</p>
                  <p className="text-green-400 font-bold text-2xl">{order.total_cost.toFixed(2)} PLN</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes (Full Width if exists) */}
          {order.notes && (
            <div className="col-span-2 bg-slate-800 p-6 rounded-lg border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Notatki</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{order.notes}</p>
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
        </div>
      </div>
    </div>
  )
}
