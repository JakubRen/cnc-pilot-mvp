// ============================================
// app/no-access/page.tsx
// Page shown when user doesn't have access to a module
// ============================================

import Link from 'next/link';

export default function NoAccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 max-w-md text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Brak dostępu
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Nie masz uprawnień do wyświetlenia tej strony.
          Skontaktuj się z administratorem, jeśli uważasz, że to błąd.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Wróć do Dashboard
          </Link>
          <Link
            href="/logout"
            className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            Wyloguj się
          </Link>
        </div>
      </div>
    </div>
  );
}
