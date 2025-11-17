/**
 * Keyboard Shortcuts Hook
 * Global keyboard shortcuts for common actions
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutConfig {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export const KEYBOARD_SHORTCUTS: ShortcutConfig[] = [
  {
    key: 'k',
    ctrlOrCmd: true,
    description: 'Global search',
    action: () => {}, // Will be overridden by component
  },
  {
    key: 'n',
    ctrlOrCmd: true,
    description: 'New order',
    action: () => {}, // Will be overridden by router
  },
  {
    key: '/',
    ctrlOrCmd: true,
    description: 'Show keyboard shortcuts',
    action: () => {}, // Will be overridden by component
  },
];

interface UseKeyboardShortcutsOptions {
  onSearch?: () => void;
  onNewOrder?: () => void;
  onShowHelp?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSearch,
  onNewOrder,
  onShowHelp,
  enabled = true,
}: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      // Ctrl+K or Cmd+K - Global search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        if (onSearch) {
          onSearch();
        } else {
          // Focus first search input on page
          const searchInput = document.querySelector<HTMLInputElement>('input[type="text"][placeholder*="Search"], input[type="text"][placeholder*="search"]');
          searchInput?.focus();
        }
        return;
      }

      // Ctrl+N or Cmd+N - New order (only when not typing)
      if (!isTyping && (event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        if (onNewOrder) {
          onNewOrder();
        } else {
          router.push('/orders/add');
        }
        return;
      }

      // Ctrl+/ or Cmd+/ - Show shortcuts help
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        if (onShowHelp) {
          onShowHelp();
        }
        return;
      }

      // Escape - Close modals/overlays
      if (event.key === 'Escape') {
        // Check if there's an open modal
        const modal = document.querySelector('[role="dialog"]');
        if (modal) {
          // Try to find and click close button
          const closeButton = modal.querySelector<HTMLButtonElement>('button[aria-label*="Close"], button[aria-label*="close"]');
          closeButton?.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onSearch, onNewOrder, onShowHelp, router]);
}

/**
 * Format shortcut for display (e.g., "Ctrl+K" or "⌘K")
 */
export function formatShortcut(shortcut: string): string {
  const isMac = typeof window !== 'undefined' && /Mac/.test(navigator.platform);

  return shortcut
    .replace('Ctrl', isMac ? '⌘' : 'Ctrl')
    .replace('Cmd', '⌘')
    .replace('Alt', isMac ? '⌥' : 'Alt')
    .replace('Shift', isMac ? '⇧' : 'Shift');
}
