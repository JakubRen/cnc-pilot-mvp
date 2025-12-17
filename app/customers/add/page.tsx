import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AddCustomerForm from './AddCustomerForm'
import AppLayout from '@/components/layout/AppLayout'

export default async function AddCustomerPage() {
  const userProfile = await getUserProfile()

  if (!userProfile || !userProfile.company_id) {
    redirect('/login')
  }

  // Check permissions (only owner, admin, manager can add customers)
  if (!['owner', 'admin', 'manager'].includes(userProfile.role)) {
    redirect('/customers')
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Dodaj nowego kontrahenta
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Uzupełnij dane kontaktowe kontrahenta (klient, sprzedawca lub kooperant)
            </p>
          </div>

          <AddCustomerForm
            companyId={userProfile.company_id}
            userId={userProfile.id}
          />
        </div>
      </div>
    </AppLayout>
  )
}
