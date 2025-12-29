import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { canAccessModule } from '@/lib/permissions-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import UserList from './UserList'
import { Button } from '@/components/ui/Button'

export default async function UsersPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/login')
  }

  // Permission check - users access
  const hasAccess = await canAccessModule('users')
  if (!hasAccess) {
    redirect('/no-access')
  }

  const supabase = await createClient()

  // Server Component - fetches data
  // OPTIMIZED: Only fetch columns needed for user list
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, company_id, hourly_rate, created_at')

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">Error</h2>
          <p className="text-red-600 dark:text-red-400">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Add Button */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Użytkownicy</h1>
            <Button
              href="/users/add"
              variant="primary"
            >
              + Dodaj Użytkownika
            </Button>
          </div>

          {/* Pass data + currentUserRole to Client Component */}
          {users && users.length > 0 ? (
            <UserList users={users} currentUserRole={userProfile.role} />
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Brak użytkowników. Dodaj nowych użytkowników!
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
