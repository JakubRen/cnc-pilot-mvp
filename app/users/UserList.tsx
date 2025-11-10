'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type User = {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

type UserListProps = {
  users: User[]
  currentUserRole: string
}

export default function UserList({ users: initialUsers, currentUserRole }: UserListProps) {
  const [showDetails, setShowDetails] = useState(true)
  const [users, setUsers] = useState(initialUsers)
  const router = useRouter()

  const handleDelete = async (userId: string, userName: string) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${userName}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    const loadingToast = toast.loading('Deleting user...')

    // Delete from Supabase
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Failed to delete user: ' + error.message)
      return
    }

    // Remove from local state (instant UI update!)
    setUsers(users.filter(u => u.id !== userId))
    toast.success(`User "${userName}" deleted successfully!`)
  }

  return (
    <div>
      {/* Toggle Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          {showDetails ? '👁️ Hide Details' : '👁️‍🗨️ Show Details'}
        </button>
        <p className="mt-2 text-slate-400 text-sm">
          Click to toggle user details visibility
        </p>
      </div>

      {/* User Cards */}
      <div className="space-y-4">
        {showDetails ? (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-all hover:shadow-lg"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <p className="text-xl font-semibold text-white">
                    {user.full_name}
                  </p>
                  <p className="text-slate-400">
                    <span className="text-slate-500">Email:</span> {user.email}
                  </p>
                  <p className="text-slate-400">
                    <span className="text-slate-500">Role:</span>{' '}
                    <span className="px-2 py-1 bg-slate-700 rounded text-sm">
                      {user.role}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Created: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/users/${user.id}/edit`}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition text-center"
                  >
                    Edit
                  </Link>

                  {/* Only show Delete button if current user is owner */}
                  {currentUserRole === 'owner' && (
                    <button
                      onClick={() => handleDelete(user.id, user.full_name)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium transition"
                    >
                      Delete
                    </button>
                  )}

                  <div className="text-xs text-slate-500 text-center mt-1">
                    ID: {String(user.id).slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-lg">
              👁️‍🗨️ Details hidden - Click "Show Details" to view users
            </p>
          </div>
        )}
      </div>

      {/* User Count */}
      <div className="mt-6 text-center text-slate-400">
        Total users: <span className="font-bold text-white">{users.length}</span>
      </div>
    </div>
  )
}
