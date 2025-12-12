'use client';

import { useEffect } from 'react';
import { signOut } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/hooks/useTranslation';

export default function LogoutPage() {
  const { t } = useTranslation();
  useEffect(() => {
    const logout = async () => {
      // Clear permissions cache
      localStorage.removeItem('cnc-pilot-permissions');
      localStorage.removeItem('cnc-pilot-permissions-ts');

      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Try to sign out from Supabase with timeout
      const signOutWithTimeout = Promise.race([
        signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);

      try {
        await signOutWithTimeout;
      } catch (error) {
        logger.error('Logout error (proceeding anyway)', { error });
      }

      // Always redirect to login, even if signOut failed
      window.location.href = '/login';
    };
    logout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-white text-xl">
        {t('auth', 'loggingOut')}
      </div>
    </div>
  );
}
