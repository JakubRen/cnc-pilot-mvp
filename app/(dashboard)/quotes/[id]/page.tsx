import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import QuoteDetailsClient from './QuoteDetailsClient'

export default async function QuoteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const userProfile = await getUserProfile()

  if (!userProfile || !userProfile.company_id) {
    redirect('/login')
  }

  // Fetch quote with creator info
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      creator:users!created_by(full_name, email)
    `)
    .eq('id', id)
    .eq('company_id', userProfile.company_id) // Security: only show quotes from user's company
    .single()

  if (error || !quote) {
    return notFound()
  }

  // Fetch quote items for multi-item quotes
  const { data: quoteItems } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('created_at', { ascending: true })

  return <QuoteDetailsClient quote={quote} quoteItems={quoteItems || []} userProfile={userProfile} />
}
