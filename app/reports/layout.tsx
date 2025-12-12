import AppLayout from '@/components/layout/AppLayout'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import ReportsTabs from '@/components/reports/ReportsTabs'
import ReportsHeader from '@/components/reports/ReportsHeader'

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <ReportsHeader />

          {/* Tabs Navigation */}
          <ReportsTabs />

          {/* Content */}
          {children}
        </div>
      </div>
    </AppLayout>
  )
}
