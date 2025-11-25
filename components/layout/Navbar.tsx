'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/lib/auth'
import toast from 'react-hot-toast'
import type { UserProfile } from '@/lib/auth'

interface NavbarProps {
  user: UserProfile
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const loadingToast = toast.loading('Logging out...')
    const { error } = await signOut()
    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Logout failed')
      return
    }

    toast.success('Logged out successfully')
    router.push('/login')
    router.refresh()
  }

  // Role badge color mapping
  const getRoleBadgeColor = () => {
    const colors = {
      owner: 'bg-purple-600',
      admin: 'bg-indigo-600',
      manager: 'bg-blue-600',
      operator: 'bg-green-600',
      viewer: 'bg-gray-600',
      pending: 'bg-yellow-600',
    }
    return colors[user.role] || colors.operator
  }

  // Check if link is active
  const isActive = (path: string) => pathname?.startsWith(path)

  return (
    <div className="mb-6">
      {/* Top bar with user info */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <span className="text-slate-400">
            Logged in as:{' '}
            <span className="text-white font-semibold">{user.email}</span>
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold text-white uppercase ${getRoleBadgeColor()}`}
          >
            {user.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
        >
          Logout
        </button>
      </div>

      {/* Navigation links */}
      <div className="flex gap-4 mt-4">
        <Link
          href="/users"
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            isActive('/users')
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Users
        </Link>
        <Link
          href="/orders"
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            isActive('/orders')
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Orders
        </Link>
        <Link
          href="/inventory"
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            isActive('/inventory')
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Inventory
        </Link>
      </div>
    </div>
  )
}
