import { supabase } from '@/lib/supabase'
import UserList from './UserList'

export default async function UsersPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Users</h1>

        {/* Pass data to Client Component */}
        {users && users.length > 0 ? (
          <UserList users={users} />
        ) : (
          <div className="text-center py-12 text-slate-400">
            No users found. Add some in Supabase!
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
