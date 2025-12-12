import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import CooperationPageClient from './CooperationPageClient'

export default async function CooperationPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch cooperants
  const { data: cooperants } = await supabase
    .from('cooperants')
    .select('*')
    .eq('company_id', user.company_id)
    .eq('is_active', true)
    .order('name')

  // Fetch active external operations
  const { data: activeOperations } = await supabase
    .from('external_operations')
    .select(`
      *,
      cooperants (
        name,
        phone,
        email
      ),
      sent_by_user:users!external_operations_sent_by_fkey (
        full_name
      ),
      external_operation_items (
        id,
        part_name,
        quantity,
        order_id,
        orders (
          order_number
        )
      )
    `)
    .eq('company_id', user.company_id)
    .in('status', ['pending', 'sent', 'in_progress', 'returning'])
    .order('created_at', { ascending: false })

  // Fetch completed operations (last 20)
  const { data: completedOperations } = await supabase
    .from('external_operations')
    .select(`
      *,
      cooperants (name)
    `)
    .eq('company_id', user.company_id)
    .eq('status', 'completed')
    .order('actual_return_date', { ascending: false })
    .limit(20)

  // Calculate stats
  const pendingCount = activeOperations?.filter(o => o.status === 'pending').length || 0
  const sentCount = activeOperations?.filter(o => o.status === 'sent' || o.status === 'in_progress').length || 0
  const returningCount = activeOperations?.filter(o => o.status === 'returning').length || 0

  // Find overdue operations
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueOperations = activeOperations?.filter(o => {
    if (!o.expected_return_date) return false
    const returnDate = new Date(o.expected_return_date)
    return returnDate < today && o.status !== 'completed'
  }) || []

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <CooperationPageClient
            cooperants={cooperants || []}
            activeOperations={activeOperations || []}
            completedOperations={completedOperations || []}
            pendingCount={pendingCount}
            sentCount={sentCount}
            returningCount={returningCount}
            overdueOperations={overdueOperations}
          />
        </div>
      </div>
    </AppLayout>
  )
}
