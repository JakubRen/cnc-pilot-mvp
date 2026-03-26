import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import ApiKeysClient from './ApiKeysClient'

export default async function ApiKeysPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Only admin/owner can manage API keys
  if (!['owner', 'admin'].includes(user.role)) {
    redirect('/settings')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Pulpit', href: '/' },
            { label: 'Ustawienia', href: '/settings' },
            { label: 'Klucze API' },
          ]}
          className="mb-4"
        />
        <h1 className="text-4xl font-bold text-foreground mb-8">Klucze API</h1>
        <ApiKeysClient />
      </div>
    </div>
  )
}
