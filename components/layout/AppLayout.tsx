'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import KeyboardShortcutsHelp from '@/components/ui/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/ui/CommandPalette';
import MobileBottomNav from './MobileBottomNav';
import { supabase } from '@/lib/supabase';
import InterfaceModeGuard from './InterfaceModeGuard';
import type { InterfaceMode } from '@/lib/auth';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [userRole, setUserRole] = useState<string | undefined>();
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode | undefined>();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fetch user role and interface_mode for CommandPalette and ViewModeToggle
  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('role, interface_mode')
          .eq('auth_id', user.id)
          .single()

        setUserRole(userProfile?.role)
        setInterfaceMode(userProfile?.interface_mode as InterfaceMode | undefined)        
      }
    }
    fetchUserData()
  }, [])

  // Enable global keyboard shortcuts
  useKeyboardShortcuts({
    onShowHelp: () => setShowShortcutsHelp(true),
  });

  return (
      <InterfaceModeGuard>
      {/* FIXED: Używamy bg-background dla spójności motywów */}
      <div className="flex min-h-screen bg-background">
      {/* Sidebar - Hidden on mobile by default, shown when toggled */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64
          transform transition-transform duration-300 ease-in-out
          lg:transform-none lg:static
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}       
        `}
      >
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} interfaceMode={interfaceMode} />
      </div>

      {/* Overlay for mobile - click to close sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full lg:w-auto">
        {/* Header */}
        <Header isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Command Palette */}
      <CommandPalette userRole={userRole} />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* Floating Help Button */}
      <button
        onClick={() => setShowShortcutsHelp(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg dark:shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center transition z-30 group focus:outline-none focus:ring-2 focus:ring-blue-500 hidden lg:flex"
        title="Keyboard Shortcuts (Ctrl+/)"
        aria-label="Show keyboard shortcuts"
      >
        <span className="text-xl">⌨️</span>
        {/* Tooltip */}
        <span className="absolute bottom-full mb-2 right-0 px-3 py-1 bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none border border-slate-700">
          Skróty klawiszowe (Ctrl+/)
        </span>
      </button>
      </div>
      </InterfaceModeGuard>
  );
}
