'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Orders page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 border border-red-700 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📦❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Failed to load orders
          </h2>
          <p className="text-slate-400 mb-6">
            There was a problem loading the orders list. This might be a temporary issue.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="bg-slate-900 border border-slate-700 rounded p-4 mb-6 text-left">
              <p className="text-red-400 text-sm font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Retry
            </button>
            <Link
              href="/"
              className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-semibold text-center"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
