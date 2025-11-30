'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

type NavKey = 'dashboard' | 'orders' | 'inventory' | 'documents' | 'files' | 'timeTracking' | 'reports' | 'tags' | 'users';

interface SidebarLink {
  href: string;
  icon: string;
  labelKey: NavKey;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const linkDefinitions: SidebarLink[] = [
  { href: '/', icon: '📊', labelKey: 'dashboard' },
  { href: '/orders', icon: '📦', labelKey: 'orders' },
  { href: '/inventory', icon: '🏭', labelKey: 'inventory' },
  { href: '/documents', icon: '📄', labelKey: 'documents' },
  { href: '/files', icon: '📁', labelKey: 'files' },
  { href: '/time-tracking', icon: '⏱️', labelKey: 'timeTracking' },
  { href: '/reports', icon: '📈', labelKey: 'reports' },
  { href: '/tags', icon: '🏷️', labelKey: 'tags' },
  { href: '/users', icon: '👥', labelKey: 'users' },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-screen">
      {/* Logo/Header */}
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('common', 'appName')}</h1>
          <p className="text-xs text-slate-400 mt-1">{t('common', 'tagline')}</p>
        </div>

        {/* Close button - only visible on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label={t('nav', 'closeMenu')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        {linkDefinitions.map((link) => {
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
              <span className="font-medium">{t('nav', link.labelKey)}</span>
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
          <span className="font-medium">{t('nav', 'logout')}</span>
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
