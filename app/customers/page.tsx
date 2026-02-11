import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { getCustomerOrderStats, scoreCustomer } from '@/lib/customer-scoring'
import CustomersPageClient from './CustomersPageClient'
import CustomerIntelligencePanel from '@/components/customers/CustomerIntelligencePanel'

export default async function CustomersPage() {
  const userProfile = await getUserProfile()

  if (!userProfile || !userProfile.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch customers for this company
  // OPTIMIZED: Only fetch columns needed for list view
  const { data: customers } = await supabase
    .from('customers')
    .select('id, company_id, name, email, phone, nip, type, street, city, postal_code, country, notes, created_at, created_by, updated_at')
    .eq('company_id', userProfile.company_id)
    .order('name')

  // Fetch order stats for scoring
  const orderStats = await getCustomerOrderStats(userProfile.company_id)

  // Compute scores for all customers
  const customerScores: Record<string, { tier: string; label: string; icon: string; color: string; orderCount: number; totalRevenue: number }> = {}
  for (const customer of customers || []) {
    const stats = orderStats.get(customer.name)
    const score = scoreCustomer(stats)
    customerScores[customer.id] = {
      tier: score.tier,
      label: score.label,
      icon: score.icon,
      color: score.color,
      orderCount: score.orderCount,
      totalRevenue: score.totalRevenue,
    }
  }

  return (
    <>
      <div className="px-8 pt-8 max-w-7xl mx-auto">
        <CustomerIntelligencePanel companyId={userProfile.company_id} />
      </div>
      <CustomersPageClient customers={customers || []} currentUserRole={userProfile.role} customerScores={customerScores} />
    </>
  )
}
