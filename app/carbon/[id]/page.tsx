import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import CarbonReportDetailClient from './CarbonReportDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CarbonReportDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch report with order details
  const { data: report, error } = await supabase
    .from('carbon_reports')
    .select(`
      *,
      orders (order_number, customer_name, part_name),
      creator:users!carbon_reports_created_by_fkey (full_name)
    `)
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (error || !report) {
    redirect('/carbon')
  }

  const createdAt = new Date(report.created_at).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const creatorName = Array.isArray(report.creator)
    ? report.creator[0]?.full_name
    : report.creator?.full_name

  return (
    <AppLayout>
      <CarbonReportDetailClient
        report={report}
        createdAt={createdAt}
        creatorName={creatorName}
      />
    </AppLayout>
  )
}
