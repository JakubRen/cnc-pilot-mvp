import { Metadata } from 'next'
import AppLayout from '@/components/layout/AppLayout'
import TagManager from '@/components/tags/TagManager'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Tagi | CNC-Pilot',
  description: 'Zarządzanie tagami dla zamówień i magazynu',
}

export default async function TagsPage() {
  const userProfile = await getUserProfile()
  if (!userProfile) redirect('/login')

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <TagManager />
        </div>
      </div>
    </AppLayout>
  )
}
