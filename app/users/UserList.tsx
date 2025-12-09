'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'

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

  const handleDelete = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `Czy na pewno chcesz usunąć użytkownika "${userName}"?\n\nTej akcji nie można cofnąć.`
    )

    if (!confirmed) return

    const loadingToast = toast.loading('Usuwanie użytkownika...')

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Błąd usuwania: ' + error.message)
      return
    }

    setUsers(users.filter(u => u.id !== userId))
    toast.success(`Użytkownik "${userName}" został usunięty!`)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">👑 Właściciel</Badge>
      case 'admin': return <Badge variant="danger">🔑 Admin</Badge>
      case 'operator': return <Badge variant="success">⚙️ Operator</Badge>
      case 'pending': return <Badge variant="warning">⏳ Oczekujący</Badge>
      default: return <Badge variant="secondary">{role}</Badge>
    }
  }

  return (
    <div>
      {/* Toggle Button */}
      <div className="mb-6">
        <Button
          onClick={() => setShowDetails(!showDetails)}
          variant="secondary"
        >
          {showDetails ? '👁️ Ukryj szczegóły' : '👁️‍🗨️ Pokaż szczegóły'}
        </Button>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
          Kliknij przycisk aby przełączyć widoczność szczegółów
        </p>
      </div>

      {/* User Cards */}
      <div className="space-y-4">
        {showDetails ? (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-all hover:shadow-lg"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <p className="text-xl font-semibold text-slate-900 dark:text-white">
                    {user.full_name}
                  </p>
                  <p className="text-slate-700 dark:text-slate-400">
                    <span className="text-slate-500 dark:text-slate-500">Email:</span> {user.email}
                  </p>
                  <div className="text-slate-700 dark:text-slate-400 flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-500">Rola:</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Utworzono: {new Date(user.created_at).toLocaleDateString('pl-PL')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    href={`/users/${user.id}/edit`}
                    variant="primary"
                    size="sm"
                  >
                    Edytuj
                  </Button>

                  {/* Only owner can delete */}
                  {currentUserRole === 'owner' && (
                    <Button
                      onClick={() => handleDelete(user.id, user.full_name)}
                      variant="danger"
                      size="sm"
                    >
                      Usuń
                    </Button>
                  )}

                  <div className="text-xs text-slate-500 dark:text-slate-500 text-center mt-1">
                    ID: {String(user.id).slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Szczegoly ukryte - Kliknij &quot;Pokaz szczegoly&quot;
            </p>
          </div>
        )}
      </div>

      {/* User Count */}
      <div className="mt-6 text-center text-slate-500 dark:text-slate-400">
        Liczba użytkowników: <span className="font-bold text-slate-900 dark:text-white">{users.length}</span>
      </div>
    </div>
  )
}
