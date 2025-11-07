'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import toast from 'react-hot-toast'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const loadingToast = toast.loading('Logging out...')

    const { error } = await signOut()

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Logout failed: ' + error.message)
      return
    }

    toast.success('Logged out successfully')
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
    >
      Logout
    </button>
  )
}
