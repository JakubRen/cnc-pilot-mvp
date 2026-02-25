'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import KeyboardShortcutsHelp from '@/components/ui/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import CommandPalette from '@/components/ui/CommandPalette';
import MobileBottomNav from './MobileBottomNav';
import InterfaceModeGuard from './InterfaceModeGuard';
import type { InterfaceMode } from '@/lib/auth';
import { LiveRegionProvider } from '@/components/ui/LiveRegion';
import { useUserProfile } from '@/hooks/useUserProfile';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const { profile } = useUserProfile();
  const userRole = profile?.role;
  const interfaceMode = profile?.interface_mode as InterfaceMode | undefined;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Enable global keyboard shortcuts
  useKeyboardShortcuts({
    onShowHelp: () => setShowShortcutsHelp(true),
  });

  return (
      <InterfaceModeGuard>
      <LiveRegionProvider>
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:bg-violet-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:font-semibold"
      >
        Przejdź do treści głównej
      </a>

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
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto pb-20 lg:pb-0">
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
        className="fixed bottom-6 right-6 w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-md flex items-center justify-center transition z-30 group focus:outline-none focus:ring-2 focus:ring-ring hidden lg:flex"
        title="Skróty klawiszowe (Ctrl+/)"
        aria-label="Pokaż skróty klawiszowe"
      >
        <QuestionMarkCircleIcon className="w-5 h-5" />
        <span className="absolute bottom-full mb-2 right-0 px-3 py-1 bg-popover text-popover-foreground text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none border border-border">
          Skróty klawiszowe (Ctrl+/)
        </span>
      </button>
      </div>
      </LiveRegionProvider>
      </InterfaceModeGuard>
  );
}
