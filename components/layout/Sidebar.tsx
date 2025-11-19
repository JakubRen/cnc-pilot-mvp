'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarLink {
  href: string;
  icon: string;
  label: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const links: SidebarLink[] = [
  { href: '/', icon: '📊', label: 'Dashboard' },
  { href: '/orders', icon: '📦', label: 'Zamówienia' },
  { href: '/inventory', icon: '🏭', label: 'Magazyn' },
  { href: '/documents', icon: '📄', label: 'Wydania' },
  { href: '/files', icon: '📁', label: 'Pliki' },
  { href: '/time-tracking', icon: '⏱️', label: 'Czas Pracy' },
  { href: '/reports', icon: '📈', label: 'Raporty' },
  { href: '/tags', icon: '🏷️', label: 'Tagi' },
  { href: '/users', icon: '👥', label: 'Użytkownicy' },
];

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-screen">
      {/* Logo/Header */}
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">CNC-Pilot</h1>
          <p className="text-xs text-slate-400 mt-1">Production Management</p>
        </div>

        {/* Close button - only visible on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Zamknij menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose} // Close sidebar on mobile after click
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActive
                  ? 'bg-blue-600 text-white border-r-4 border-blue-400'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-700">
        <Link
          href="/logout"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-colors group focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">Wyloguj</span>
        </Link>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          <p>Day 10: Multi-Tenancy + Auth</p>
          <p className="mt-1">© 2024 CNC-Pilot</p>
        </div>
      </div>
    </aside>
  );
}
