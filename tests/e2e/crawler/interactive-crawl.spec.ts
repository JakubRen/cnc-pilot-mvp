/**
 * Interactive Crawl — Level 2
 *
 * Visits every route, then interacts: clicks safe buttons, tabs,
 * tests form inputs, and closes any modals that open.
 * Collects all errors and prints a summary report.
 *
 * Uses storageState from crawler-auth.setup.ts so each test is already logged in.
 */

import { test, expect } from '@playwright/test'
import { CRAWLER_CONFIG } from './crawler.config'
import {
  visitPage,
  clickSafeButtons,
  clickTabs,
  testFormInputs,
  closeModals,
  createErrorCollector,
  buildReport,
  printReport,
  type PageReport,
  type PageError,
} from './crawler-utils'
import { STORAGE_STATE } from './crawler-auth.spec'

test.use({ storageState: STORAGE_STATE })

test.describe('Interactive Crawl — Level 2', () => {
  test.describe.configure({ mode: 'serial' })

  const pageReports: PageReport[] = []
  const suiteStart = Date.now()

  for (const route of CRAWLER_CONFIG.routes) {
    test(`interactive: ${route.name} (${route.path})`, async ({ page }) => {
      test.setTimeout(120_000)

      // 1. Visit the page (smoke-level check)
      const report = await visitPage(page, route)

      // If page was skipped (e.g. redirect to login), record and move on
      if (report.status === 'skip') {
        pageReports.push(report)
        return
      }

      // 2. Set up error collector for interactive phase
      const interactiveCollector = createErrorCollector(page, route.path)

      // 3. Click safe buttons (max 5)
      const buttonErrors = await clickSafeButtons(page, route.path)
      await closeModals(page)

      // 4. Click all visible tabs
      const tabErrors = await clickTabs(page, route.path)
      await closeModals(page)

      // 5. Test form inputs (fill + clear)
      const formErrors = await testFormInputs(page, route.path)
      await closeModals(page)

      // 6. Merge all errors into the page report
      const interactiveErrors = interactiveCollector.getErrors()
      const allErrors: PageError[] = [
        ...report.errors,
        ...buttonErrors,
        ...tabErrors,
        ...formErrors,
        ...interactiveErrors,
      ]

      const finalReport: PageReport = {
        ...report,
        errors: allErrors,
        status: allErrors.some((e) => e.severity === 'error') ? 'fail' : 'pass',
      }

      pageReports.push(finalReport)
    })
  }

  test('report — summary', async () => {
    const report = buildReport('interactive', pageReports, suiteStart)
    printReport(report)

    // Assert no critical failures (pages that completely failed to load)
    const criticalFailures = pageReports.filter(
      (p) => p.status === 'fail' && p.errors.some((e) => e.type === 'crash' || e.type === 'load'),
    )
    expect(
      criticalFailures.length,
      `Critical failures on: ${criticalFailures.map((p) => p.route.path).join(', ')}`,
    ).toBe(0)
  })
})
