/**
 * Level 1 — Smoke Crawl
 * Visits every route, checks for load errors, blank pages, and console errors.
 * Produces a summary report at the end.
 *
 * Uses storageState from crawler-auth.setup.ts so each test is already logged in.
 */

import { test, expect } from '@playwright/test'
import { CRAWLER_CONFIG } from './crawler.config'
import {
  visitPage,
  buildReport,
  printReport,
  type PageReport,
} from './crawler-utils'
import { STORAGE_STATE } from './crawler-auth.spec'

test.use({ storageState: STORAGE_STATE })

const pages: PageReport[] = []
const startTime = Date.now()

test.describe('Smoke Crawl', () => {
  test.describe.configure({ mode: 'serial' })

  for (const route of CRAWLER_CONFIG.routes) {
    test(`visit ${route.name} (${route.path})`, async ({ page }) => {
      const report = await visitPage(page, route)
      pages.push(report)
    })
  }

  test('summary report', async () => {
    const report = buildReport('smoke', pages, startTime)
    printReport(report)

    expect(
      report.failed,
      `${report.failed} page(s) failed — see report above`,
    ).toBe(0)
  })
})
