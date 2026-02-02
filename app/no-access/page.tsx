// ============================================
// app/no-access/page.tsx
// Page shown when user doesn't have access to a module
// ============================================

'use client'

import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export default function NoAccessPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border p-8 max-w-md text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold text-foreground mb-4">
          {t('auth', 'noAccess')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t('auth', 'noAccessMessage')}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
          >
            {t('auth', 'returnToDashboard')}
          </Link>
          <Link
            href="/logout"
            className="px-6 py-3 bg-secondary text-foreground rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            {t('nav', 'logout')}
          </Link>
        </div>
      </div>
    </div>
  );
}
