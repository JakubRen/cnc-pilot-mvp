'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import toast from 'react-hot-toast'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const loadingToast = toast.loading('Wylogowywanie...')

    const { error } = await signOut()

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Wylogowanie nie powiodło się: ' + error.message)
      return
    }

    toast.success('Wylogowano pomyślnie')
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
    >
      Wyloguj
    </button>
  )
}
