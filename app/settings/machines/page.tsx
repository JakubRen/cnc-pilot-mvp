import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import MachineCostsClient from './MachineCostsClient'

export default async function MachineCostsPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Only admin/owner can access settings
  if (!['owner', 'admin'].includes(user.role)) {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch machines
  const { data: machines } = await supabase
    .from('machines')
    .select('id, name, code, manufacturer, model, status')
    .eq('company_id', user.company_id)
    .eq('status', 'active')
    .order('name')

  // Fetch existing machine costs
  const { data: machineCosts } = await supabase
    .from('machine_costs')
    .select('*')
    .eq('company_id', user.company_id)

  // Create a map of machine_id to costs
  const costsMap: Record<string, NonNullable<typeof machineCosts>[number]> = {}
  machineCosts?.forEach(cost => {
    costsMap[cost.machine_id] = cost
  })

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link href="/settings" className="text-violet-500 hover:text-violet-400 text-sm">
              ← Powrót do ustawień
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground">Koszty Maszyn (ABC)</h1>
            <p className="text-muted-foreground mt-1">
              Konfiguracja kosztów operacyjnych do kalkulacji stawki godzinowej (Real Hourly Rate)
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/30 rounded-lg p-4 mb-8">
            <h3 className="text-violet-700 dark:text-violet-300 font-semibold mb-2">Jak działa wycena ABC?</h3>
            <p className="text-primary text-sm">
              Stawka godzinowa maszyny = (Koszty stałe roczne / Efektywne godziny pracy) + Koszty zmienne na godzinę.
              Efektywne godziny = Godziny pracy × Dni robocze × OEE%. Wprowadź dane poniżej aby system automatycznie
              obliczał rzeczywiste koszty produkcji.
            </p>
          </div>

          {!machines || machines.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🔧</div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Brak aktywnych maszyn</h2>
              <p className="text-muted-foreground mb-6">
                Najpierw dodaj maszyny do systemu, aby skonfigurować ich koszty operacyjne.
              </p>
              <Link
                href="/machines/add"
                className="inline-block px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
              >
                Dodaj maszynę
              </Link>
            </div>
          ) : (
            <MachineCostsClient
              machines={machines}
              costsMap={costsMap}
              companyId={user.company_id}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
