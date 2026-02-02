// ============================================
// components/layout/ViewModeToggle.tsx
// Toggle between Kiosk and Full view modes
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { InterfaceMode } from '@/lib/auth';

interface ViewModeToggleProps {
  interfaceMode?: InterfaceMode;
}

export default function ViewModeToggle({ interfaceMode }: ViewModeToggleProps) {
  const pathname = usePathname();
  const isKioskMode = pathname === '/kiosk';

  // Only show toggle if user has 'both' mode
  if (interfaceMode !== 'both') {
    return null;
  }

  return (
    <div className="p-4 border-t border-border">
      <Link
        href={isKioskMode ? '/' : '/kiosk'}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
          isKioskMode
            ? 'bg-violet-600 text-white hover:bg-violet-700'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        <span className="text-xl">{isKioskMode ? '📊' : '🖥️'}</span>
        <span>{isKioskMode ? 'Pełny widok' : 'Tryb Kiosk'}</span>
      </Link>
    </div>
  );
}
