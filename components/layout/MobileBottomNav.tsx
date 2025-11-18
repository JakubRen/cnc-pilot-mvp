'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileBottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', icon: '📊', label: 'Home' },
    { href: '/orders', icon: '📦', label: 'Orders' },
    { href: '/inventory', icon: '🏭', label: 'Stock' },
    { href: '/documents', icon: '📄', label: 'Docs' },
    { href: '/reports', icon: '📈', label: 'Reports' },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-800 border-t border-slate-700 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition ${
                isActive
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
