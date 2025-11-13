import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import UserList from './UserList'
import Link from 'next/link'

export default async function UsersPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Server Component - fetches data
  const { data: users, error } = await supabase
    .from('users')
    .select('*')

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error.message}</p>
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
            <h1 className="text-4xl font-bold text-white">Użytkownicy</h1>
            <Link
              href="/users/add"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
            >
              + Dodaj Użytkownika
            </Link>
          </div>

          {/* Pass data + currentUserRole to Client Component */}
          {users && users.length > 0 ? (
            <UserList users={users} currentUserRole={userProfile.role} />
          ) : (
            <div className="text-center py-12 text-slate-400">
              Brak użytkowników. Dodaj nowych użytkowników!
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
