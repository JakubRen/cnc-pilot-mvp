/**
 * Crawler Auth Setup
 * Logs in once and saves the browser state (cookies + localStorage)
 * so all crawler tests can reuse the authenticated session.
 */

import { test as setup } from '@playwright/test'
import { CRAWLER_CONFIG } from './crawler.config'
import * as path from 'path'

export const STORAGE_STATE = path.resolve(__dirname, '../.auth/crawler-user.json')

setup('authenticate for crawler', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')
  await page.fill('input[type="email"]', CRAWLER_CONFIG.auth.email)
  await page.fill('input[type="password"]', CRAWLER_CONFIG.auth.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: CRAWLER_CONFIG.timeouts.navigation })
  await page.waitForLoadState('domcontentloaded')

  // Save signed-in state
  await page.context().storageState({ path: STORAGE_STATE })
})
