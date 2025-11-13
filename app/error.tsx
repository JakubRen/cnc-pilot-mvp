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
    // Log error to console (in production, send to error tracking service)
    console.error('Error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 border border-red-700 rounded-lg p-8 text-center">
          {/* Icon */}
          <div className="text-6xl mb-4">⚠️</div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">
            Oops! Something went wrong
          </h2>

          {/* Description */}
          <p className="text-slate-400 mb-6">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>

          {/* Error Message (Dev only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-slate-900 border border-slate-700 rounded p-4 mb-6 text-left">
              <p className="text-red-400 text-sm font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-semibold text-center"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
