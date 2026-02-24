// ============================================
// components/layout/InterfaceModeGuard.tsx
// Redirects users based on their interface_mode setting
// Uses UserProfileProvider context instead of its own fetch
// ============================================

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { InterfaceMode } from '@/lib/auth';

// Pages that kiosk_only users CAN access
const KIOSK_ALLOWED_PATHS = ['/kiosk', '/logout', '/login', '/no-access'];

// Pages that should NOT trigger redirect (API, auth, etc.)
const EXCLUDED_PATHS = ['/api/', '/auth/', '/_next/'];

export default function InterfaceModeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, loading } = useUserProfile();

  useEffect(() => {
    // Still loading profile from context — wait
    if (loading) return;

    // Skip check for excluded paths
    if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) return;

    // Skip check for kiosk allowed paths
    if (KIOSK_ALLOWED_PATHS.includes(pathname)) return;

    // No profile means no user — nothing to guard
    if (!profile) return;

    const interfaceMode = profile.interface_mode as InterfaceMode | null;

    // If user has kiosk_only mode and is trying to access non-kiosk page
    if (interfaceMode === 'kiosk_only' && !KIOSK_ALLOWED_PATHS.includes(pathname)) {
      router.replace('/kiosk');
    }
  }, [loading, profile, pathname, router]);

  // Show spinner while profile is loading (prevents flash of content)
  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}
