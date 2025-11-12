'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarLink {
  href: string;
  icon: string;
  label: string;
}

const links: SidebarLink[] = [
  { href: '/', icon: '📊', label: 'Dashboard' },
  { href: '/orders', icon: '📦', label: 'Zamówienia' },
  { href: '/inventory', icon: '🏭', label: 'Magazyn' },
  { href: '/time-tracking', icon: '⏱️', label: 'Czas Pracy' },
  { href: '/users', icon: '👥', label: 'Użytkownicy' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo/Header */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">CNC-Pilot</h1>
        <p className="text-xs text-slate-400 mt-1">Production Management</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
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

      {/* Footer */}
      <div className="p-6 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          <p>Day 9: Dashboard + Nav</p>
          <p className="mt-1">© 2024 CNC-Pilot</p>
        </div>
      </div>
    </aside>
  );
}
