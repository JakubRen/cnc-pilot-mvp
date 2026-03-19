/**
 * Crawler Configuration
 * All routes, timeouts, and selectors for the 3-level test bot.
 */

export const CRAWLER_CONFIG = {
  /** All sidebar routes to crawl */
  routes: [
    { path: '/', name: 'Pulpit', module: 'dashboard' },
    { path: '/orders', name: 'Zamówienia', module: 'orders' },
    { path: '/production', name: 'Plan Produkcji', module: 'orders' },
    { path: '/customers', name: 'Kontrahenci', module: 'orders' },
    { path: '/quotes', name: 'Oferty', module: 'orders' },
    { path: '/calendar', name: 'Kalendarz', module: 'calendar' },
    { path: '/products', name: 'Towary', module: 'inventory' },
    { path: '/inventory', name: 'Magazyn', module: 'inventory' },
    { path: '/documents', name: 'Dokumenty', module: 'documents' },
    { path: '/cooperation', name: 'Kooperacja', module: 'cooperation' },
    { path: '/machines', name: 'Maszyny', module: 'machines' },
    { path: '/reports', name: 'Raporty', module: 'reports' },
    { path: '/users', name: 'Użytkownicy', module: 'users' },
    { path: '/settings', name: 'Ustawienia', module: 'users' },
  ],

  /** Timeouts in ms */
  timeouts: {
    pageLoad: 15_000,
    action: 10_000,
    short: 3_000,
    modal: 5_000,
    navigation: 20_000,
  },

  /** Selectors for interactive crawl */
  selectors: {
    /** Buttons that are safe to click — scoped to main content area, skip nav/header */
    safeButtons: [
      'main button:not([data-destructive]):not([aria-label*="Usuń"]):not([aria-label*="Delete"])',
    ],
    /** Modals/dialogs */
    modal: '[role="dialog"], [data-state="open"], .modal',
    modalClose: '[aria-label="Close"], [data-dismiss], button:has-text("Zamknij"), button:has-text("Anuluj")',
    /** Tabs — custom TabsList component uses bg-muted wrapper with button children */
    tabs: '.bg-muted > button, [role="tablist"] > button, [role="tab"]',
    /** Form inputs — scoped to main content */
    textInputs: 'main input[type="text"], main input[type="email"], main input[type="number"], main input[type="search"], main textarea',
    /** Drawers */
    drawer: '[data-state="open"][role="dialog"], .drawer',
  },

  /** Console error patterns to IGNORE (known/expected) */
  ignoredErrors: [
    'Download the React DevTools',
    'Warning: ',
    'favicon.ico',
    'next-router-prefetch',
    'hydration',
    '%c%s%c',
    'Fetched plans:',
  ],

  /** Test credentials */
  auth: {
    email: process.env.TEST_USER_EMAIL || 'test@cnc-pilot.pl',
    password: process.env.TEST_USER_PASSWORD || 'test123456',
  },
} as const

export type CrawlerRoute = (typeof CRAWLER_CONFIG.routes)[number]
