import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2 text-sm', className)}>
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center">
              {/* Separator */}
              {index > 0 && (
                <svg
                  className="w-4 h-4 mx-2 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}

              {/* Breadcrumb item */}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    'flex items-center gap-1.5',
                    isLast
                      ? 'text-slate-900 dark:text-white font-medium'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Helper to create breadcrumbs from pathname
export function useBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
  ]

  // Page name mappings
  const pageNames: Record<string, string> = {
    orders: 'Zamówienia',
    inventory: 'Magazyn',
    'time-tracking': 'Czas pracy',
    users: 'Użytkownicy',
    machines: 'Maszyny',
    settings: 'Ustawienia',
    reports: 'Raporty',
    docs: 'Dokumentacja',
    documents: 'Dokumenty',
    'quality-control': 'Kontrola jakości',
    add: 'Dodaj',
    edit: 'Edytuj',
  }

  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`

    // Skip UUIDs and numeric IDs
    if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ||
        segment.match(/^\d+$/)) {
      // For IDs, use a generic label
      breadcrumbs.push({
        label: `#${segment.slice(0, 8)}`,
        href: currentPath,
      })
    } else {
      breadcrumbs.push({
        label: pageNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: index === segments.length - 1 ? undefined : currentPath,
      })
    }
  })

  return breadcrumbs
}
