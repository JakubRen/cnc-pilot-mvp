import DocsNavigation from '@/components/docs/DocsNavigation'

export const metadata = {
  title: 'Dokumentacja - CNC-Pilot',
  description: 'Portal wiedzy i dokumentacja systemu CNC-Pilot',
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <DocsNavigation />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
