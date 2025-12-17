import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import QuoteViewClient from './QuoteViewClient'

export default async function QuoteViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // Fetch quote by token (PUBLIC ACCESS - no auth required!)
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      companies(name)
    `)
    .eq('token', token)
    .single()

  if (error || !quote) {
    return notFound()
  }

  // Check if expired
  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date()

  // Auto-update status to "viewed" if first view
  if (!quote.viewed_at && !isExpired && quote.status === 'sent') {
    await supabase
      .from('quotes')
      .update({
        viewed_at: new Date().toISOString(),
        status: 'viewed'
      })
      .eq('id', quote.id)
  }

  return <QuoteViewClient quote={quote} isExpired={isExpired} />
}
