import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import AuditLogsClient from './AuditLogsClient'
import AuditLogsHeader from './AuditLogsHeader'
import NoAccessMessage from './NoAccessMessage'
import { logger } from '@/lib/logger'

export const metadata = {
  title: 'Audit Log | CNC Pilot',
  description: 'History of user changes and actions'
}

export default async function AuditLogsPage() {
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Only admins and owners can view audit logs
  const allowedRoles = ['owner', 'admin']
  if (!allowedRoles.includes(user.role)) {
    return (
      <AppLayout>
        <NoAccessMessage />
      </AppLayout>
    )
  }

  // Fetch audit logs
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      user:users!audit_logs_user_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('company_id', user.company_id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    logger.error('Error fetching audit logs', { error })
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <AuditLogsHeader />
          <AuditLogsClient logs={logs || []} />
        </div>
      </div>
    </AppLayout>
  )
}
