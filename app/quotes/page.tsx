import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'
import QuotesPageClient from './QuotesPageClient'

export default async function QuotesPage() {
  const supabase = await createClient()
  const userProfile = await getUserProfile()

  if (!userProfile || !userProfile.company_id) {
    redirect('/login')
  }

  // Fetch all quotes for company
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      *,
      creator:users!created_by(full_name)
    `)
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching quotes', { error })
  }

  return <QuotesPageClient quotes={quotes || []} userProfile={userProfile} />
}
