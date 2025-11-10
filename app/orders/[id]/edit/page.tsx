import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import EditOrderForm from './EditOrderForm'

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch order
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Edit Order #{order.order_number}</h1>
        <EditOrderForm order={order} />
      </div>
    </div>
  )
}
