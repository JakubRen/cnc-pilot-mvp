import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import CarbonPageClient from './CarbonPageClient'

export default async function CarbonPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch material emissions (global + company)
  const { data: materials } = await supabase
    .from('material_emissions')
    .select('*')
    .or(`company_id.is.null,company_id.eq.${user.company_id}`)
    .eq('is_active', true)
    .order('material_category')
    .order('material_name')

  // Fetch energy emissions
  const { data: energies } = await supabase
    .from('energy_emissions')
    .select('*')
    .or(`company_id.is.null,company_id.eq.${user.company_id}`)
    .eq('is_active', true)
    .order('energy_type')

  // Fetch recent carbon reports
  const { data: recentReports } = await supabase
    .from('carbon_reports')
    .select(`
      *,
      orders (order_number, customer_name)
    `)
    .eq('company_id', user.company_id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Stats
  const totalReports = recentReports?.length || 0
  const totalCO2 = recentReports?.reduce((sum, r) => sum + (r.total_co2_kg || 0), 0) || 0

  return (
    <AppLayout>
      <CarbonPageClient
        materials={materials || []}
        energies={energies || []}
        reports={recentReports || []}
        totalReports={totalReports}
        totalCO2={totalCO2}
        companyId={user.company_id}
        userId={user.id}
      />
    </AppLayout>
  )
}
