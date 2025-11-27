import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AddInventoryForm from './AddInventoryForm'

export default async function AddInventoryPage() {
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Dodaj nową pozycję magazynową</h1>
        <AddInventoryForm />
      </div>
    </div>
  )
}
