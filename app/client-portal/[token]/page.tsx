import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'

interface ClientOrder {
  id: string
  order_number: string
  part_name: string | null
  quantity: number
  deadline: string
  status: string
  created_at: string
}

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // Validate token and get customer info
  const { data: tokenData, error: tokenError } = await supabase
    .from('client_access_tokens')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (tokenError || !tokenData) {
    notFound()
  }

  // Check if token is expired
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-white mb-2">Link wygasł</h1>
          <p className="text-slate-400">
            Ten link do portalu klienta wygasł. Skontaktuj się z dostawcą, aby otrzymać nowy link.
          </p>
        </div>
      </div>
    )
  }

  // Update access stats (fire and forget)
  supabase
    .from('client_access_tokens')
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (tokenData.access_count || 0) + 1
    })
    .eq('id', tokenData.id)
    .then(() => {})

  // Fetch orders for this customer
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, part_name, quantity, deadline, status, created_at')
    .eq('company_id', tokenData.company_id)
    .eq('customer_name', tokenData.customer_name)
    .order('deadline', { ascending: true })

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; progress: number }> = {
      pending: { label: 'Oczekuje', color: 'bg-yellow-500', progress: 10 },
      in_progress: { label: 'W realizacji', color: 'bg-blue-500', progress: 50 },
      completed: { label: 'Ukończone', color: 'bg-green-500', progress: 100 },
      delayed: { label: 'Opóźnione', color: 'bg-red-500', progress: 60 },
      cancelled: { label: 'Anulowane', color: 'bg-gray-500', progress: 0 },
    }
    return statusMap[status] || { label: status, color: 'bg-gray-500', progress: 0 }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const isOverdue = (deadline: string, status: string) => {
    if (status === 'completed' || status === 'cancelled') return false
    return new Date(deadline) < new Date()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Portal Klienta</h1>
            <p className="text-slate-400 text-sm">{tokenData.customer_name}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Ostatnia aktualizacja</p>
            <p className="text-white text-sm">{formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white">{orders?.length || 0}</p>
            <p className="text-slate-400 text-sm">Wszystkie</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-400">
              {orders?.filter(o => o.status === 'in_progress').length || 0}
            </p>
            <p className="text-slate-400 text-sm">W realizacji</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-400">
              {orders?.filter(o => o.status === 'completed').length || 0}
            </p>
            <p className="text-slate-400 text-sm">Ukończone</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">
              {orders?.filter(o => o.status === 'pending').length || 0}
            </p>
            <p className="text-slate-400 text-sm">Oczekuje</p>
          </div>
        </div>

        {/* Orders List */}
        <h2 className="text-lg font-semibold text-white mb-4">Twoje zamówienia</h2>

        {!orders || orders.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-slate-400">Brak aktywnych zamówień</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: ClientOrder) => {
              const statusInfo = getStatusInfo(order.status)
              const overdue = isOverdue(order.deadline, order.status)

              return (
                <div
                  key={order.id}
                  className={`bg-slate-800 border rounded-lg p-4 ${
                    overdue ? 'border-red-500/50' : 'border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold">{order.order_number}</span>
                        {overdue && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                            Po terminie
                          </span>
                        )}
                      </div>
                      {order.part_name && (
                        <p className="text-slate-400 text-sm">{order.part_name}</p>
                      )}
                      <p className="text-slate-500 text-xs mt-1">
                        Ilość: {order.quantity} szt. | Termin: {formatDate(order.deadline)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="md:text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusInfo.color} transition-all duration-500`}
                        style={{ width: `${statusInfo.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Przyjęte</span>
                      <span>W produkcji</span>
                      <span>Gotowe</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>Portal klienta CNC-Pilot</p>
          <p className="text-xs mt-1">
            Masz pytania? Skontaktuj się bezpośrednio z dostawcą.
          </p>
        </footer>
      </main>
    </div>
  )
}
