// ============================================
// components/layout/InterfaceModeGuard.tsx
// Redirects users based on their interface_mode setting
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { InterfaceMode } from '@/lib/auth';

// Pages that kiosk_only users CAN access
const KIOSK_ALLOWED_PATHS = ['/kiosk', '/logout', '/login', '/no-access'];

// Pages that should NOT trigger redirect (API, auth, etc.)
const EXCLUDED_PATHS = ['/api/', '/auth/', '/_next/'];

export default function InterfaceModeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkInterfaceMode() {
      // Skip check for excluded paths
      if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) {
        setIsChecking(false);
        return;
      }

      // Skip check for kiosk allowed paths
      if (KIOSK_ALLOWED_PATHS.includes(pathname)) {
        setIsChecking(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsChecking(false);
          return;
        }

        const { data: userProfile } = await supabase
          .from('users')
          .select('interface_mode')
          .eq('auth_id', user.id)
          .single();

        const interfaceMode = userProfile?.interface_mode as InterfaceMode | null;

        // If user has kiosk_only mode and is trying to access non-kiosk page
        if (interfaceMode === 'kiosk_only' && !KIOSK_ALLOWED_PATHS.includes(pathname)) {
          router.replace('/kiosk');
          return;
        }
      } catch (error) {
        console.error('Error checking interface mode:', error);
      }

      setIsChecking(false);
    }

    checkInterfaceMode();
  }, [pathname, router]);

  // Show nothing while checking (prevents flash of content)
  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}
