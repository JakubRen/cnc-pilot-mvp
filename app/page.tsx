import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <main className="flex flex-col items-center gap-6 p-8 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-white tracking-tight">
            CNC-Pilot MVP
          </h1>
          <p className="text-2xl text-slate-300 font-light">
            Production Management System
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 text-slate-400">
          <p className="text-sm">✅ Next.js 16 + TypeScript</p>
          <p className="text-sm">✅ Tailwind CSS</p>
          <p className="text-sm">✅ App Router</p>
          <p className="text-sm">✅ Supabase Database</p>
        </div>

        <div className="mt-12 flex flex-col gap-4">
          <Link
            href="/dashboard"
            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-semibold text-lg shadow-xl hover:shadow-2xl"
          >
            📊 Dashboard (Command Center)
          </Link>

          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            Login →
          </Link>

          <Link
            href="/users"
            className="inline-block px-8 py-4 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-semibold text-lg"
          >
            View Users
          </Link>

          <Link
            href="/orders"
            className="inline-block px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
          >
            View Orders
          </Link>

          <Link
            href="/inventory"
            className="inline-block px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg"
          >
            View Inventory
          </Link>

          <Link
            href="/time-tracking"
            className="inline-block px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold text-lg"
          >
            ⏱️ Time Tracking
          </Link>

          <div className="px-6 py-3 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-300 text-sm">
              🚀 Day 9: Dashboard + Production Planning
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
