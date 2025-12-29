import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import CustomersPageClient from './CustomersPageClient'

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
    .select('id, name, email, phone, nip, city, created_at')
    .eq('company_id', userProfile.company_id)
    .order('name')

  return <CustomersPageClient customers={customers || []} currentUserRole={userProfile.role} />
}
