import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import OperationDetailClient from './OperationDetailClient'

export default async function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch operation with all relations
  const { data: operation, error } = await supabase
    .from('external_operations')
    .select(`
      *,
      cooperants (
        id,
        name,
        service_type,
        contact_person,
        phone,
        email,
        address
      ),
      sent_by_user:users!external_operations_sent_by_fkey (
        full_name
      ),
      received_by_user:users!external_operations_received_by_fkey (
        full_name
      ),
      external_operation_items (
        id,
        part_name,
        quantity,
        unit,
        status,
        order_id,
        orders (
          order_number,
          customer_name
        )
      )
    `)
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (error || !operation) {
    notFound()
  }

  return (
    <AppLayout>
      <OperationDetailClient operation={operation} userId={user.id} />
    </AppLayout>
  )
}
