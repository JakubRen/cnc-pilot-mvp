'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Orders page error', { error });
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-card border border-red-300 dark:border-red-700 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📦❌</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Failed to load orders
          </h2>
          <p className="text-muted-foreground mb-6">
            There was a problem loading the orders list. This might be a temporary issue.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="bg-muted border border-border rounded p-4 mb-6 text-left">
              <p className="text-red-600 dark:text-red-400 text-sm font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
            >
              Retry
            </button>
            <Link
              href="/"
              className="flex-1 px-6 py-3 bg-secondary text-foreground rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition font-semibold text-center"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
