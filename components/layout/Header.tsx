'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import NotificationBell from './NotificationBell';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  UserIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ isSidebarOpen = true, onToggleSidebar }: HeaderProps) {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { profile } = useUserProfile();
  const userName = profile?.full_name || profile?.email || 'User';
  const userRole = profile?.role || 'operator';
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30';
      case 'admin':
        return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30';
      case 'operator':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRoleLabel = (role: string) => {
    const roleKey = role as 'owner' | 'admin' | 'manager' | 'operator' | 'viewer' | 'pending';
    return t('roles', roleKey);
  };

  return (
    <header className="bg-card sticky top-0 z-50 border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-lg transition-colors focus:outline-none"
          aria-label={t('nav', 'toggleSidebar')}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isSidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      )}

      {/* Breadcrumb Placeholder or Page Title could go here */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-4">

        <NotificationBell />

        <div className="h-6 w-px bg-border mx-2"></div>

        <ThemeToggle />

        {/* User Profile */}
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-3 py-1.5 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full"></div>
            </div>

            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-foreground">{userName}</div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-wider font-mono border ${getRoleBadgeColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </div>
            </div>

            <svg
              className="w-4 h-4 text-muted-foreground transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-card rounded-lg shadow-md border border-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="sm:hidden px-4 py-3 border-b border-border bg-muted">
                <div className="text-sm font-medium text-foreground">{userName}</div>
                <div className="text-xs text-muted-foreground mt-1">{userRole}</div>
              </div>

              <div className="p-1">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>{t('nav', 'profile')}</span>
                </Link>

                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  <span>{t('nav', 'settings')}</span>
                </Link>
              </div>

              <div className="border-t border-border my-1" />

              <div className="p-1">
                <Link
                  href="/logout"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                  <span>{t('nav', 'logout')}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
