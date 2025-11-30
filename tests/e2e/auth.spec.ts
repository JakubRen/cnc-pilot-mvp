import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login')

    // Check main elements are visible
    await expect(page.locator('h1')).toContainText('CNC')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login')

    // Click submit without filling form
    await page.click('button[type="submit"]')

    // Wait for validation errors
    await page.waitForTimeout(500)

    // Check that we're still on login page (not redirected)
    await expect(page).toHaveURL(/.*login/)
  })

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show validation error
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/.*login/)
  })

  test('should show error for short password', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', '123') // Too short
    await page.click('button[type="submit"]')

    // Should show validation error
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/.*login/)
  })

  test('should have link to register page', async ({ page }) => {
    await page.goto('/login')

    const registerLink = page.locator('a[href="/register"]')
    await expect(registerLink).toBeVisible()

    await registerLink.click()
    await expect(page).toHaveURL(/.*register/)
  })

  test('should have link to forgot password page', async ({ page }) => {
    await page.goto('/login')

    const forgotLink = page.locator('a[href="/forgot-password"]')
    await expect(forgotLink).toBeVisible()
  })

  // Note: Full login test requires test credentials
  // This can be enabled when we have a test user setup
  test.skip('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })
})

test.describe('Register Page', () => {
  test('should display register page correctly', async ({ page }) => {
    await page.goto('/register')

    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should have link to login page', async ({ page }) => {
    await page.goto('/register')

    const loginLink = page.locator('a[href="/login"]')
    await expect(loginLink).toBeVisible()
  })
})
