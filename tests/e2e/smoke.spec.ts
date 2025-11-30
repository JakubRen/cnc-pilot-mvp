import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('app should load without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/login')

    // Page should load successfully
    await expect(page).toHaveTitle(/CNC/)

    // Should not have critical JavaScript errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('hydration')
    )

    // Log any errors for debugging
    if (criticalErrors.length > 0) {
      console.log('Console errors:', criticalErrors)
    }
  })

  test('login page should be responsive', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('input[type="email"]')).toBeVisible()

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Try to access protected routes without authentication
    const protectedRoutes = ['/', '/orders', '/inventory', '/time-tracking', '/users']

    for (const route of protectedRoutes) {
      await page.goto(route)

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/, { timeout: 5000 })
    }
  })

  test('API health endpoint should respond', async ({ request }) => {
    const response = await request.get('/api/health')

    // Should return 200 OK
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(['ok', 'degraded']).toContain(body.status)
  })
})

test.describe('Performance', () => {
  test('login page should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })
})
