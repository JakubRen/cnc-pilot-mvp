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
        </div>

        <div className="mt-12 px-6 py-3 bg-slate-800 rounded-lg border border-slate-700">
          <p className="text-slate-300 text-sm">
            🚀 Day 1 Complete - Ready to build!
          </p>
        </div>
      </main>
    </div>
  );
}
