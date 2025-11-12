'use client';

import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
