import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import PricingConfigClient from './PricingConfigClient'

export default async function PricingConfigPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Only admin/owner can access settings
  if (!['owner', 'admin'].includes(user.role)) {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch pricing config
  const { data: pricingConfig } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('company_id', user.company_id)
    .single()

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link href="/settings" className="text-violet-500 hover:text-violet-400 text-sm">
              ← Powrót do ustawień
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground">Konfiguracja Wyceny</h1>
            <p className="text-muted-foreground mt-1">
              Globalne ustawienia cen energii, marż i rabatów ilościowych
            </p>
          </div>

          <PricingConfigClient
            pricingConfig={pricingConfig}
            companyId={user.company_id}
          />
        </div>
      </div>
    </AppLayout>
  )
}
