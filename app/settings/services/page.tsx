import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import ExternalServicesClient from './ExternalServicesClient'

export default async function ExternalServicesPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Only admin/owner can access settings
  if (!['owner', 'admin'].includes(user.role)) {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch external services
  const { data: services } = await supabase
    .from('external_services')
    .select('*')
    .eq('company_id', user.company_id)
    .order('name')

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link href="/settings" className="text-blue-500 hover:text-blue-400 text-sm">
              ← Powrót do ustawień
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Usługi Kooperacyjne</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Zarządzanie usługami zewnętrznymi: anodowanie, hartowanie, malowanie proszkowe, itp.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg p-4 mb-8">
            <h3 className="text-blue-700 dark:text-blue-300 font-semibold mb-2">Jak działają usługi kooperacyjne?</h3>
            <p className="text-blue-600 dark:text-blue-400 text-sm">
              Usługi zewnętrzne są doliczane do wyceny oferty. Każda usługa ma cenę bazową oraz narzut za obsługę
              (handling fee) pokrywający transport, ryzyko i administrację. Całkowity koszt = cena_bazowa × ilość × (1 + handling_fee%).
            </p>
          </div>

          <ExternalServicesClient
            services={services || []}
            companyId={user.company_id}
          />
        </div>
      </div>
    </AppLayout>
  )
}
