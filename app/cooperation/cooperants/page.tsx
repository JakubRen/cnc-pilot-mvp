import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import CooperantsPageClient from './CooperantsPageClient'

export default async function CooperantsPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch all cooperants
  const { data: cooperants } = await supabase
    .from('cooperants')
    .select('*')
    .eq('company_id', user.company_id)
    .order('name')

  // Get stats per cooperant
  const { data: stats } = await supabase
    .from('external_operations')
    .select('cooperant_id, status')
    .eq('company_id', user.company_id)

  const cooperantStats = (cooperants || []).map(coop => {
    const coopOps = stats?.filter(s => s.cooperant_id === coop.id) || []
    return {
      ...coop,
      totalOperations: coopOps.length,
      activeOperations: coopOps.filter(s => ['pending', 'sent', 'in_progress', 'returning'].includes(s.status)).length
    }
  })

  return (
    <AppLayout>
      <CooperantsPageClient cooperants={cooperantStats} />
    </AppLayout>
  )
}
