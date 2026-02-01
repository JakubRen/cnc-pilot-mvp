import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import OrderQCClient from './OrderQCClient'

export default async function OrderQCPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch order basic info
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, part_name, status, length, width, height, tolerance_length, tolerance_width, tolerance_height')
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (error || !order) {
    notFound()
  }

  // Fetch QC plans for this company
  const { data: plans, error: plansError } = await supabase
    .from('quality_control_plans')
    .select(`
      id,
      name,
      part_name,
      description,
      quality_control_items (
        id,
        name,
        nominal_value,
        tolerance_plus,
        tolerance_minus,
        unit,
        is_critical,
        sort_order
      )
    `)
    .eq('company_id', user.company_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  console.log('[QC DEBUG] user.company_id:', user.company_id, 'plans:', plans?.length, 'error:', plansError)

  // Fetch measurements for this order
  const { data: measurements } = await supabase
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
        name
      ),
      users (
        full_name
      )
    `)
    .eq('order_id', id)
    .order('measured_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
      <div className="max-w-5xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Zamówienia', href: '/orders' },
            { label: `#${order.order_number}`, href: `/orders/${id}` },
            { label: 'Kontrola Jakości' },
          ]}
          className="mb-6"
        />

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              Kontrola Jakości
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Zamówienie #{order.order_number} — {order.customer_name}
              {order.part_name && ` — ${order.part_name}`}
            </p>
          </div>
          <Link
            href={`/orders/${id}`}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm"
          >
            ← Wróć do zamówienia
          </Link>
        </div>

        <OrderQCClient
          orderId={id}
          orderNumber={order.order_number}
          plans={(plans as any) || []}
          measurements={(measurements as any) || []}
          userId={user.id}
          companyId={user.company_id}
          orderDimensions={{
            partName: order.part_name || '',
            length: order.length || null,
            width: order.width || null,
            height: order.height || null,
            tolerance_length: order.tolerance_length || null,
            tolerance_width: order.tolerance_width || null,
            tolerance_height: order.tolerance_height || null,
          }}
        />
      </div>
    </div>
  )
}
