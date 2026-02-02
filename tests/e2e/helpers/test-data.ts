// ============================================
// Test Data Constants
// ============================================

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@cnc-pilot.pl',
  password: process.env.TEST_USER_PASSWORD || 'test123456',
}

export const TIMEOUTS = {
  navigation: 20_000,
  action: 15_000,
  short: 5_000,
  load: 10_000,
}

export const PROTECTED_ROUTES = [
  '/',
  '/orders',
  '/inventory',
  '/time-tracking',
  '/users',
  '/production',
] as const

export const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const
