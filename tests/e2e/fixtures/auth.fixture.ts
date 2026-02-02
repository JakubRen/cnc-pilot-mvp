// ============================================
// Auth Fixture — Reusable authenticated session
// ============================================
// Provides `authenticatedPage` that's already logged in.
// Uses storageState to avoid re-login per test.
// ============================================

import { test as base, expect, type Page } from '@playwright/test'
import path from 'path'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@cnc-pilot.pl',
  password: process.env.TEST_USER_PASSWORD || 'test123456',
}

const STORAGE_STATE_PATH = path.join(__dirname, '..', '..', '..', '.playwright', 'auth-state.json')

/**
 * Login helper — performs login and returns the page.
 * Used by the fixture and can be used standalone.
 */
export async function loginAs(page: Page, email?: string, password?: string) {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')
  await page.fill('input[type="email"]', email || TEST_USER.email)
  await page.fill('input[type="password"]', password || TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 20000 })
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Extended test with `authenticatedPage` fixture.
 * This page is already logged in before each test.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await loginAs(page)
    await use(page)
  },
})

export { expect }
export { TEST_USER }
