import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import AuditLogsClient from './AuditLogsClient'

export const metadata = {
  title: 'Dziennik Zdarzeń | CNC Pilot',
  description: 'Historia zmian i akcji użytkowników'
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
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-8 text-center max-w-md">
            <h1 className="text-2xl font-bold text-red-200 mb-4">Brak dostępu</h1>
            <p className="text-red-300">
              Tylko właściciele i administratorzy mogą przeglądać dziennik zdarzeń.
            </p>
          </div>
        </div>
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
    console.error('Error fetching audit logs:', error)
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Dziennik Zdarzeń</h1>
            <p className="text-slate-400">
              Historia wszystkich akcji i zmian wykonanych przez użytkowników
            </p>
          </div>

          <AuditLogsClient logs={logs || []} />
        </div>
      </div>
    </AppLayout>
  )
}
