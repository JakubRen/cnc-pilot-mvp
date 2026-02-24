import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import { scoreCustomer } from '@/lib/customer-scoring'
import CustomerDetailsClient from './CustomerDetailsClient'

interface CustomerDetailsPageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailsPage({ params }: CustomerDetailsPageProps) {
  const userProfile = await getUserProfile()

  if (!userProfile || !userProfile.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { id } = await params

  // Fetch customer with company_id check (security)
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('company_id', userProfile.company_id)
    .single()

  if (error || !customer) {
    notFound()
  }

  // Fetch related quotes
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_number, total_price, status, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  // Fetch related orders (include fields for scoring + predictions)
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, deadline, created_at, selling_price, material, quantity, margin_percent')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  // Compute customer score from orders
  const orderList = orders || []
  const totalRevenue = orderList.reduce((sum, o) => sum + (o.selling_price || 0), 0)
  const customerScore = scoreCustomer({
    customerName: customer.name,
    orderCount: orderList.length,
    totalRevenue,
    lastOrderDate: orderList[0]?.created_at || null,
  })

  return (
    <CustomerDetailsClient
      customer={customer}
      quotes={quotes || []}
      orders={orderList}
      currentUserRole={userProfile.role}
      customerScore={{ tier: customerScore.tier, label: customerScore.label, icon: customerScore.icon, color: customerScore.color, orderCount: customerScore.orderCount, totalRevenue: customerScore.totalRevenue }}
    />
  )
}
