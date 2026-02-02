import { test, expect } from '@playwright/test'
import { PROTECTED_ROUTES, VIEWPORTS } from './helpers/test-data'

test.describe('Smoke Tests', () => {
  test('app loads without critical console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/login')
    await expect(page).toHaveTitle(/CNC/)

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('hydration')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('login page is responsive across viewports', async ({ page }) => {
    for (const [name, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size)
      await page.goto('/login')
      await expect(page.locator('input[type="email"]')).toBeVisible()
    }
  })

  test('unauthenticated users are redirected from protected routes', async ({ page }) => {
    for (const route of PROTECTED_ROUTES) {
      await page.goto(route)
      await expect(page).toHaveURL(/.*login/, { timeout: 5000 })
    }
  })

  test('API health endpoint responds OK', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(['ok', 'degraded']).toContain(body.status)
  })

  test('login page loads within 3 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    expect(Date.now() - start).toBeLessThan(3000)
  })
})
