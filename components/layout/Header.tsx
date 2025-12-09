'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import NotificationBell from './NotificationBell';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ isSidebarOpen = true, onToggleSidebar }: HeaderProps) {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('users')
            .select('full_name, role')
            .eq('auth_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
            setUserName(user.email || 'User');
            setUserRole('operator');
            return;
          }

          if (profile) {
            setUserName(profile.full_name || user.email || 'User');
            setUserRole(profile.role || 'operator');
          } else {
            setUserName(user.email || 'User');
            setUserRole('operator');
          }
        }
      } catch (error) {
        console.error('Error in fetchUserProfile:', error);
        setUserName('User');
        setUserRole('operator');
      }
    };

    fetchUserProfile();
  }, []);

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
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30';
      case 'operator':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30';
    }
  };

  const getRoleLabel = (role: string) => {
    const roleKey = role as 'owner' | 'admin' | 'manager' | 'operator' | 'viewer' | 'pending';
    return t('roles', roleKey);
  };

  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-slate-200 dark:border-border px-6 py-4 flex items-center justify-between backdrop-blur-md shadow-sm dark:shadow-none">
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-slate-400 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground p-2 rounded-lg transition-colors focus:outline-none"
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

        <div className="h-6 w-px bg-slate-200 dark:bg-border mx-2"></div>

        <ThemeToggle />

        {/* User Profile */}
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all duration-300 border border-transparent hover:border-slate-200 dark:hover:border-border group"
          >
            {/* Avatar with Glow */}
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md dark:shadow-[0_0_10px_rgba(6,182,212,0.3)] group-hover:shadow-lg dark:group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-shadow">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#030712] rounded-full"></div>
            </div>

            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-slate-900 dark:text-foreground group-hover:text-blue-600 dark:group-hover:text-primary transition-colors">{userName}</div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-wider font-mono border ${getRoleBadgeColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </div>
            </div>

            <svg
              className="w-4 h-4 text-slate-400 dark:text-muted-foreground transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 glass-panel rounded-lg shadow-xl dark:shadow-2xl border border-slate-200 dark:border-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="sm:hidden px-4 py-3 border-b border-slate-200 dark:border-border bg-slate-50 dark:bg-black/20">
                <div className="text-sm font-medium text-slate-900 dark:text-foreground">{userName}</div>
                <div className="text-xs text-slate-500 dark:text-muted-foreground mt-1">{userRole}</div>
              </div>

              <div className="p-1">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="text-lg">👤</span>
                  <span>{t('nav', 'profile')}</span>
                </Link>

                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="text-lg">⚙️</span>
                  <span>{t('nav', 'settings')}</span>
                </Link>
              </div>

              <div className="border-t border-slate-200 dark:border-border my-1" />

              <div className="p-1">
                <Link
                  href="/logout"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-destructive hover:bg-red-50 dark:hover:bg-destructive/10 rounded-md transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="text-lg">🚪</span>
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
