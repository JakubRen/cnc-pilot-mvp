'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissions } from '@/hooks/usePermissions';
import type { AppModule } from '@/types/permissions';
import type { InterfaceMode } from '@/lib/auth';
import ViewModeToggle from './ViewModeToggle';

type NavKey = 'dashboard' | 'orders' | 'production' | 'customers' | 'quotes' | 'calendar' | 'inventory' | 'documents' | 'timeTracking' | 'qualityControl' | 'cooperation' | 'machines' | 'carbon' | 'costs' | 'reports' | 'users' | 'settings' | 'docs';

interface SidebarLink {
  href: string;
  icon: string;
  labelKey: NavKey;
  module: AppModule;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  interfaceMode?: InterfaceMode;
}

const linkDefinitions: SidebarLink[] = [
  { href: '/', icon: '📊', labelKey: 'dashboard', module: 'dashboard' },
  { href: '/orders', icon: '📦', labelKey: 'orders', module: 'orders' },
  { href: '/production', icon: '⚙️', labelKey: 'production', module: 'orders' },
  { href: '/customers', icon: '👥', labelKey: 'customers', module: 'orders' },
  { href: '/quotes', icon: '📋', labelKey: 'quotes', module: 'orders' },
  { href: '/calendar', icon: '📅', labelKey: 'calendar', module: 'calendar' },
  { href: '/inventory', icon: '🔩', labelKey: 'inventory', module: 'inventory' },
  { href: '/documents', icon: '📄', labelKey: 'documents', module: 'documents' },
  { href: '/time-tracking', icon: '⏱️', labelKey: 'timeTracking', module: 'time-tracking' },
  { href: '/quality-control', icon: '✅', labelKey: 'qualityControl', module: 'quality-control' },
  { href: '/cooperation', icon: '🚛', labelKey: 'cooperation', module: 'cooperation' },
  { href: '/machines', icon: '🔧', labelKey: 'machines', module: 'machines' },
  { href: '/carbon', icon: '🌿', labelKey: 'carbon', module: 'carbon' },
  { href: '/costs', icon: '💰', labelKey: 'costs', module: 'costs' },
  { href: '/reports', icon: '📈', labelKey: 'reports', module: 'reports' },
  { href: '/users', icon: '👤', labelKey: 'users', module: 'users' },
  { href: '/settings', icon: '⚙️', labelKey: 'settings', module: 'users' },
  { href: '/docs', icon: '📚', labelKey: 'docs', module: 'dashboard' },
];

export default function Sidebar({ onClose, interfaceMode }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { canAccess, loading } = usePermissions();

  const visibleLinks = loading
    ? linkDefinitions
    : linkDefinitions.filter((link) => canAccess(link.module));

  return (
    <aside className="w-64 glass-panel border-r border-slate-200 dark:border-border flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform lg:translate-x-0 lg:static shadow-sm dark:shadow-none">
      <div className="p-6 border-b border-slate-200 dark:border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-wider" style={{ textShadow: 'var(--text-glow)' }}>
            {t('common', 'appName')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 tracking-widest uppercase dark:opacity-70">
            {t('common', 'tagline')}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 dark:text-muted-foreground hover:text-blue-600 dark:hover:text-primary transition focus:outline-none"
            aria-label={t('nav', 'closeMenu')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-all duration-300 relative group overflow-hidden ${
                isActive
                  ? 'text-blue-600 dark:text-primary bg-blue-50 dark:bg-accent/30 border-r-4 border-blue-600 dark:border-r-2 dark:border-primary'
                  : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 dark:bg-primary/5 dark:blur-md pointer-events-none hidden dark:block" />
              )}
              
              <span className={`text-xl relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'dark:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''}`}>
                {link.icon}
              </span>
              <span className="font-medium relative z-10">{t('nav', link.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <ViewModeToggle interfaceMode={interfaceMode} />

      <div className="p-4 border-t border-slate-200 dark:border-border">
        <Link
          href="/logout"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 dark:text-muted-foreground hover:bg-red-50 dark:hover:bg-destructive/10 hover:text-red-600 dark:hover:text-destructive rounded-lg transition-colors group"
        >
          <span className="text-xl group-hover:rotate-12 transition-transform">🚪</span>
          <span className="font-medium">{t('nav', 'logout')}</span>
        </Link>
      </div>

      <div className="px-6 py-3 border-t border-slate-200 dark:border-border bg-slate-50 dark:bg-black/20">
        <div className="text-xs text-slate-500 dark:text-muted-foreground/60 font-mono">
          <a
            href="https://stats.uptimerobot.com/g4Pua2N0Z3"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-primary transition-colors mb-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            SYSTEM ONLINE
          </a>
          <p className="opacity-50">CNC-PILOT v1.2</p>
        </div>
      </div>
    </aside>
  );
}
