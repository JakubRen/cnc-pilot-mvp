'use client';

import { useEffect } from 'react';
import { signOut } from '@/lib/auth';
import { logger } from '@/lib/logger';

export default function LogoutPage() {
  useEffect(() => {
    const logout = async () => {
      try {
        await signOut();
      } catch (error) {
        logger.error('Logout error', { error });
      }
      // Clear permissions cache
      localStorage.removeItem('cnc-pilot-permissions');
      localStorage.removeItem('cnc-pilot-permissions-ts');
      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      // Użyj window.location zamiast router.push dla pewności
      window.location.href = '/login';
    };
    logout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-white text-xl">
        Wylogowywanie...
      </div>
    </div>
  );
}
