'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpenIcon,
  CodeBracketIcon,
  QuestionMarkCircleIcon,
  PlayCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const navigation = [
  {
    name: 'Wprowadzenie',
    href: '/docs',
    icon: BookOpenIcon,
  },
  {
    name: 'Poradnik Użytkownika',
    icon: BookOpenIcon,
    children: [
      { name: 'Pierwsze kroki', href: '/docs/user-guide/getting-started' },
      { name: 'Zamówienia', href: '/docs/user-guide/orders' },
      { name: 'Magazyn', href: '/docs/user-guide/inventory' },
      { name: 'Śledzenie czasu', href: '/docs/user-guide/time-tracking' },
      { name: 'Użytkownicy', href: '/docs/user-guide/users' },
      { name: 'Raporty', href: '/docs/user-guide/reports' },
    ],
  },
  {
    name: 'Dokumentacja Techniczna',
    icon: CodeBracketIcon,
    children: [
      { name: 'Schemat bazy danych', href: '/docs/technical/database-schema' },
      { name: 'Referencja API', href: '/docs/technical/api-reference' },
      { name: 'Uwierzytelnianie', href: '/docs/technical/authentication' },
      { name: 'Multi-tenancy', href: '/docs/technical/multi-tenancy' },
    ],
  },
  {
    name: 'FAQ',
    href: '/docs/faq',
    icon: QuestionMarkCircleIcon,
  },
  {
    name: 'Video Tutoriale',
    href: '/docs/video-tutorials',
    icon: PlayCircleIcon,
  },
  {
    name: 'Diagramy Procesów',
    href: '/docs/flowcharts',
    icon: ChartBarIcon,
  },
]

export default function DocsNavigation() {
  const pathname = usePathname()

  return (
    <nav className="w-64 bg-slate-800 border-r border-slate-700 p-6 overflow-y-auto">
      <div className="mb-6">
        <Link href="/" className="text-white font-bold text-xl hover:text-blue-400 transition">
          ← CNC-Pilot
        </Link>
      </div>

      <div className="space-y-1">
        {navigation.map((item) => {
          if (item.children) {
            return (
              <div key={item.name} className="mb-4">
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-sm uppercase mb-2">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </div>
                <div className="ml-2 space-y-1">
                  {item.children.map((child) => {
                    const isActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-lg text-sm transition ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </div>

      <div className="mt-8 pt-8 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          CNC-Pilot Dokumentacja
          <br />
          Wersja 1.0
        </p>
      </div>
    </nav>
  )
}
