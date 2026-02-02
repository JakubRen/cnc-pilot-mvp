'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermissions } from '@/hooks/usePermissions';
import type { AppModule } from '@/types/permissions';
import type { InterfaceMode } from '@/lib/auth';
import ViewModeToggle from './ViewModeToggle';
import {
  ChartBarIcon,
  ShoppingBagIcon,
  CogIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  TruckIcon,
  WrenchIcon,
  ChartBarSquareIcon,
  UserIcon,
  BookOpenIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type NavKey = 'dashboard' | 'orders' | 'production' | 'customers' | 'quotes' | 'calendar' | 'products' | 'inventory' | 'documents' | 'timeTracking' | 'qualityControl' | 'cooperation' | 'machines' | 'carbon' | 'costs' | 'reports' | 'users' | 'settings' | 'docs';

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface SidebarLink {
  href: string;
  icon: HeroIcon;
  labelKey: NavKey;
  module: AppModule;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  interfaceMode?: InterfaceMode;
}

const linkDefinitions: SidebarLink[] = [
  { href: '/', icon: ChartBarIcon, labelKey: 'dashboard', module: 'dashboard' },
  { href: '/orders', icon: ShoppingBagIcon, labelKey: 'orders', module: 'orders' },
  { href: '/production', icon: CogIcon, labelKey: 'production', module: 'orders' },
  { href: '/customers', icon: UsersIcon, labelKey: 'customers', module: 'orders' },
  { href: '/quotes', icon: ClipboardDocumentListIcon, labelKey: 'quotes', module: 'orders' },
  { href: '/calendar', icon: CalendarIcon, labelKey: 'calendar', module: 'calendar' },
  { href: '/products', icon: CubeIcon, labelKey: 'products', module: 'inventory' },
  { href: '/inventory', icon: WrenchScrewdriverIcon, labelKey: 'inventory', module: 'inventory' },
  { href: '/documents', icon: DocumentTextIcon, labelKey: 'documents', module: 'documents' },
  { href: '/cooperation', icon: TruckIcon, labelKey: 'cooperation', module: 'cooperation' },
  { href: '/machines', icon: WrenchIcon, labelKey: 'machines', module: 'machines' },
  { href: '/reports', icon: ChartBarSquareIcon, labelKey: 'reports', module: 'reports' },
  { href: '/users', icon: UserIcon, labelKey: 'users', module: 'users' },
  { href: '/settings', icon: CogIcon, labelKey: 'settings', module: 'users' },
  { href: '/docs', icon: BookOpenIcon, labelKey: 'docs', module: 'dashboard' },
];

export default function Sidebar({ onClose, interfaceMode }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { canAccess, loading } = usePermissions();

  const visibleLinks = loading
    ? linkDefinitions
    : linkDefinitions.filter((link) => canAccess(link.module));

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform lg:translate-x-0 lg:static shadow-sm">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-wider">
            {t('common', 'appName')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
            {t('common', 'tagline')}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-muted-foreground hover:text-primary transition focus:outline-none"
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
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'text-primary bg-accent border-r-2 border-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{t('nav', link.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <ViewModeToggle interfaceMode={interfaceMode} />

      <div className="p-4 border-t border-border">
        <Link
          href="/logout"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
        >
          <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
          <span className="font-medium">{t('nav', 'logout')}</span>
        </Link>
      </div>

      <div className="px-6 py-3 border-t border-border bg-muted">
        <div className="text-xs text-muted-foreground font-mono">
          <a
            href="https://stats.uptimerobot.com/g4Pua2N0Z3"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-primary transition-colors mb-2"
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
