import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import EditCustomerForm from './EditCustomerForm'
import AppLayout from '@/components/layout/AppLayout'

interface EditCustomerPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const userProfile = await getUserProfile()

  if (!userProfile || !userProfile.company_id) {
    redirect('/login')
  }

  // Check permissions
  if (!['owner', 'admin', 'manager'].includes(userProfile.role)) {
    redirect('/customers')
  }

  const supabase = await createClient()
  const { id } = await params

  // Fetch customer with company_id check (security)
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('company_id', userProfile.company_id)
    .single()

  if (error || !customer) {
    notFound()
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Edytuj klienta
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {customer.name}
            </p>
          </div>

          <EditCustomerForm customer={customer} />
        </div>
      </div>
    </AppLayout>
  )
}
