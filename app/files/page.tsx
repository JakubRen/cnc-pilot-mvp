import { Metadata } from 'next'
import AppLayout from '@/components/layout/AppLayout'
import FilesPageClient from './FilesPageClient'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'Pliki | CNC-Pilot',
  description: 'Zarządzanie plikami i dokumentami',
}

export const dynamic = 'force-dynamic'

export default async function FilesPage() {
  const userProfile = await getUserProfile()
  if (!userProfile) redirect('/login')

  const supabase = await createClient()

  // Fetch uploaded files
  const { data: files } = await supabase
    .from('files')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  return (
    <AppLayout>
      <FilesPageClient initialFiles={files || []} />
    </AppLayout>
  )
}
