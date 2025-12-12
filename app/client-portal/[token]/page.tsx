import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ExpiredLinkMessage from './ExpiredLinkMessage'
import ClientPortalContent from './ClientPortalContent'

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
    return <ExpiredLinkMessage />
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

  return (
    <ClientPortalContent
      customerName={tokenData.customer_name}
      orders={orders || []}
    />
  )
}
