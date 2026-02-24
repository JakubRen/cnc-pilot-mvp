import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AddCustomerForm from './AddCustomerForm'

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
<div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Dodaj nowego kontrahenta
          </h1>
          <p className="text-muted-foreground">
            Uzupełnij dane kontaktowe kontrahenta (klient, sprzedawca lub kooperant)
          </p>
        </div>

        <AddCustomerForm
          companyId={userProfile.company_id}
          userId={userProfile.id}
        />
      </div>
    </div>
)
}
