/**
 * Crawler Utilities
 * Shared helpers for all 3 crawl levels: login, error collection, reporting.
 */

import { type Page, expect } from '@playwright/test'
import { CRAWLER_CONFIG, type CrawlerRoute } from './crawler.config'

// ── Types ──────────────────────────────────────────

export interface PageError {
  route: string
  type: 'console' | 'network' | 'crash' | 'load' | 'interaction'
  message: string
  severity: 'error' | 'warning'
}

export interface PageReport {
  route: CrawlerRoute
  status: 'pass' | 'fail' | 'skip'
  loadTimeMs: number
  errors: PageError[]
  screenshot?: string
}

export interface CrawlReport {
  timestamp: string
  level: 'smoke' | 'interactive' | 'scenario'
  totalPages: number
  passed: number
  failed: number
  skipped: number
  pages: PageReport[]
  totalErrors: number
  duration: string
}

// ── Login ──────────────────────────────────────────

export async function crawlerLogin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')
  await page.fill('input[type="email"]', CRAWLER_CONFIG.auth.email)
  await page.fill('input[type="password"]', CRAWLER_CONFIG.auth.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: CRAWLER_CONFIG.timeouts.navigation })
  await page.waitForLoadState('domcontentloaded')
}

// ── Error Collection ───────────────────────────────

export function createErrorCollector(page: Page, routePath: string) {
  const errors: PageError[] = []

  // Console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      const isIgnored = CRAWLER_CONFIG.ignoredErrors.some((pattern) =>
        text.includes(pattern),
      )
      if (!isIgnored) {
        errors.push({
          route: routePath,
          type: 'console',
          message: text.slice(0, 500),
          severity: 'error',
        })
      }
    }
  })

  // Uncaught exceptions
  page.on('pageerror', (error) => {
    errors.push({
      route: routePath,
      type: 'crash',
      message: `JS Exception: ${error.message.slice(0, 500)}`,
      severity: 'error',
    })
  })

  // Failed network requests (4xx/5xx)
  page.on('response', (response) => {
    const status = response.status()
    if (status >= 400 && !response.url().includes('favicon')) {
      errors.push({
        route: routePath,
        type: 'network',
        message: `${status} ${response.url().slice(0, 200)}`,
        severity: status >= 500 ? 'error' : 'warning',
      })
    }
  })

  return {
    getErrors: () => errors,
    hasErrors: () => errors.some((e) => e.severity === 'error'),
  }
}

// ── Page Visit ─────────────────────────────────────

export async function visitPage(
  page: Page,
  route: CrawlerRoute,
): Promise<PageReport> {
  const collector = createErrorCollector(page, route.path)
  const startTime = Date.now()

  try {
    await page.goto(route.path, {
      timeout: CRAWLER_CONFIG.timeouts.pageLoad,
      waitUntil: 'domcontentloaded',
    })
    await page.waitForLoadState('networkidle', {
      timeout: CRAWLER_CONFIG.timeouts.short,
    }).catch(() => {
      // networkidle timeout is OK — page might have polling
    })

    const loadTimeMs = Date.now() - startTime

    // Check page didn't redirect to login (permission issue)
    const currentUrl = page.url()
    if (currentUrl.includes('/login') && route.path !== '/login') {
      return {
        route,
        status: 'skip',
        loadTimeMs,
        errors: [{
          route: route.path,
          type: 'load',
          message: `Redirected to login — missing permission for module: ${route.module}`,
          severity: 'warning',
        }],
      }
    }

    // Check for blank page / error page
    const bodyText = await page.textContent('body').catch(() => '')
    if (!bodyText || bodyText.trim().length < 10) {
      collector.getErrors().push({
        route: route.path,
        type: 'load',
        message: 'Page appears blank or failed to render',
        severity: 'error',
      })
    }

    const errors = collector.getErrors()
    return {
      route,
      status: errors.some((e) => e.severity === 'error') ? 'fail' : 'pass',
      loadTimeMs,
      errors,
    }
  } catch (error) {
    return {
      route,
      status: 'fail',
      loadTimeMs: Date.now() - startTime,
      errors: [{
        route: route.path,
        type: 'load',
        message: `Failed to load: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      }],
    }
  }
}

// ── Interactive Helpers ────────────────────────────

export async function clickSafeButtons(
  page: Page,
  routePath: string,
  maxClicks = 5,
): Promise<PageError[]> {
  const errors: PageError[] = []
  const buttons = await page
    .locator(CRAWLER_CONFIG.selectors.safeButtons[0])
    .all()

  let clicked = 0
  for (const button of buttons) {
    if (clicked >= maxClicks) break
    try {
      const isVisible = await button.isVisible().catch(() => false)
      const isEnabled = await button.isEnabled().catch(() => false)
      if (!isVisible || !isEnabled) continue

      const text = await button.textContent().catch(() => '')
      // Skip destructive-looking buttons and dropdown triggers
      if (text && /usuń|delete|remove|wyczyść/i.test(text)) continue
      if (text && /wszystkie|filtr|sortuj|eksport|import/i.test(text)) continue

      await button.click({ timeout: CRAWLER_CONFIG.timeouts.short })
      clicked++
      console.log(`    [interactive] ${routePath} — clicked button: "${(text || '').trim().slice(0, 40)}"`)

      // Wait a beat for any modal/error to appear
      await page.waitForTimeout(500)

      // Close any dropdown/popover/modal that may have opened
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(200)
      await closeModals(page)
    } catch {
      // Click failed — that's OK, move on
    }
  }

  console.log(`    [interactive] ${routePath} — buttons: ${buttons.length} found, ${clicked} clicked`)
  return errors
}

export async function closeModals(page: Page): Promise<void> {
  try {
    const closeBtn = page.locator(CRAWLER_CONFIG.selectors.modalClose).first()
    const isVisible = await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)
    if (isVisible) {
      await closeBtn.click({ timeout: CRAWLER_CONFIG.timeouts.short })
      await page.waitForTimeout(300)
    }
  } catch {
    // No modal or close button — OK
    try {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } catch {
      // Escape also failed — move on
    }
  }
}

export async function clickTabs(
  page: Page,
  routePath: string,
): Promise<PageError[]> {
  const errors: PageError[] = []
  const tabs = await page.locator(CRAWLER_CONFIG.selectors.tabs).all()
  let clicked = 0

  for (const tab of tabs) {
    try {
      const isVisible = await tab.isVisible().catch(() => false)
      if (!isVisible) continue
      await tab.click({ timeout: CRAWLER_CONFIG.timeouts.short })
      clicked++
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(200)
    } catch {
      // Tab click failed — move on
    }
  }

  console.log(`    [interactive] ${routePath} — tabs: ${tabs.length} found, ${clicked} clicked`)
  return errors
}

export async function testFormInputs(
  page: Page,
  routePath: string,
): Promise<PageError[]> {
  const errors: PageError[] = []
  const inputs = await page
    .locator(CRAWLER_CONFIG.selectors.textInputs)
    .all()

  let filled = 0
  for (const input of inputs.slice(0, 5)) {
    try {
      const isVisible = await input.isVisible().catch(() => false)
      const isEnabled = await input.isEnabled().catch(() => false)
      if (!isVisible || !isEnabled) continue

      // Type test text, then clear
      await input.fill('test-crawler-input')
      filled++
      await page.waitForTimeout(200)
      await input.fill('')
    } catch {
      // Input interaction failed — move on
    }
  }

  console.log(`    [interactive] ${routePath} — inputs: ${inputs.length} found, ${filled} filled`)
  return errors
}

// ── Reporting ──────────────────────────────────────

export function printReport(report: CrawlReport): void {
  console.log('\n' + '='.repeat(60))
  console.log(`  TEST CRAWLER REPORT — ${report.level.toUpperCase()}`)
  console.log(`  ${report.timestamp} | Duration: ${report.duration}`)
  console.log('='.repeat(60))

  for (const page of report.pages) {
    const icon = page.status === 'pass' ? '✅' : page.status === 'fail' ? '❌' : '⏭️'
    const time = `${page.loadTimeMs}ms`
    console.log(`${icon} ${page.route.name.padEnd(20)} ${page.route.path.padEnd(18)} ${time.padStart(8)}`)

    for (const error of page.errors) {
      const prefix = error.severity === 'error' ? '   🔴' : '   🟡'
      console.log(`${prefix} [${error.type}] ${error.message.slice(0, 100)}`)
    }
  }

  console.log('\n' + '-'.repeat(60))
  console.log(`  TOTAL: ${report.totalPages} pages | ✅ ${report.passed} | ❌ ${report.failed} | ⏭️ ${report.skipped}`)
  console.log(`  ERRORS: ${report.totalErrors}`)
  console.log('='.repeat(60) + '\n')
}

export function buildReport(
  level: CrawlReport['level'],
  pages: PageReport[],
  startTime: number,
): CrawlReport {
  return {
    timestamp: new Date().toISOString(),
    level,
    totalPages: pages.length,
    passed: pages.filter((p) => p.status === 'pass').length,
    failed: pages.filter((p) => p.status === 'fail').length,
    skipped: pages.filter((p) => p.status === 'skip').length,
    pages,
    totalErrors: pages.reduce((sum, p) => sum + p.errors.filter((e) => e.severity === 'error').length, 0),
    duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
  }
}
