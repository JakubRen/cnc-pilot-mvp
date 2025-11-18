'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import NotificationBell from './NotificationBell';
import ThemeToggle from '@/components/theme/ThemeToggle';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ isSidebarOpen = true, onToggleSidebar }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current user profile
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('auth_id', user.id)
          .single();

        if (profile) {
          setUserName(profile.full_name || user.email || 'User');
          setUserRole(profile.role || 'operator');
        }
      }
    };

    fetchUserProfile();
  }, []);

  // Close dropdown when clicking outside
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
        return 'bg-purple-600 text-white';
      case 'admin':
        return 'bg-blue-600 text-white';
      case 'operator':
        return 'bg-green-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Właściciel';
      case 'admin':
        return 'Administrator';
      case 'operator':
        return 'Operator';
      default:
        return role;
    }
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      {/* Mobile Menu Button */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-white hover:bg-slate-700 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle sidebar"
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification Bell */}
      <NotificationBell />

      {/* Theme Toggle */}
      <div className="ml-4">
        <ThemeToggle />
      </div>

      {/* User Profile Dropdown */}
      <div className="relative ml-4" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {/* Avatar */}
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>

          {/* User Info */}
          <div className="text-left hidden sm:block">
            <div className="text-sm font-medium text-white">{userName}</div>
            <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-0.5 ${getRoleBadgeColor(userRole)}`}>
              {getRoleLabel(userRole)}
            </div>
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* User Info (Mobile) */}
            <div className="sm:hidden px-4 py-3 border-b border-slate-600">
              <div className="text-sm font-medium text-white">{userName}</div>
              <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${getRoleBadgeColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </div>
            </div>

            {/* Menu Items */}
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setIsDropdownOpen(false)}
            >
              <span className="text-lg">👤</span>
              <span>Mój Profil</span>
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setIsDropdownOpen(false)}
            >
              <span className="text-lg">⚙️</span>
              <span>Ustawienia</span>
            </Link>

            <div className="border-t border-slate-600" />

            <Link
              href="/logout"
              className="flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-600/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setIsDropdownOpen(false)}
            >
              <span className="text-lg">🚪</span>
              <span>Wyloguj</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
