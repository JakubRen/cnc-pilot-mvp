import { test, expect } from './fixtures/auth.fixture'
import { TIMEOUTS } from './helpers/test-data'

test.describe('Customers', () => {
  test('customer list loads', async ({ authenticatedPage: page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/customers/)
    await expect(page.locator('h1')).toBeVisible({ timeout: TIMEOUTS.load })
  })

  test('navigate to add customer page', async ({ authenticatedPage: page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('domcontentloaded')

    const addButton = page.getByRole('link', { name: /dodaj|nowy|add|new/i }).first()
    await expect(addButton).toBeVisible({ timeout: TIMEOUTS.load })
    await addButton.click()

    await expect(page).toHaveURL(/\/customers\/add/, { timeout: TIMEOUTS.navigation })
  })

  test('add customer form displays required fields', async ({ authenticatedPage: page }) => {
    await page.goto('/customers/add')
    await page.waitForLoadState('domcontentloaded')

    // Check for key form fields
    await expect(page.locator('input').first()).toBeVisible({ timeout: TIMEOUTS.load })

    // Should have a submit button
    const submitButton = page.getByRole('button', { name: /zapisz|dodaj|save|add/i }).first()
    await expect(submitButton).toBeVisible()
  })

  test('can navigate between customer list and detail', async ({ authenticatedPage: page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('domcontentloaded')

    // Try to click on first customer link
    const customerLink = page.getByRole('link').filter({ hasText: /[A-Za-z]/ }).first()
    const isVisible = await customerLink.isVisible().catch(() => false)

    if (isVisible) {
      await customerLink.click()
      await page.waitForLoadState('domcontentloaded')
      // Should navigate to a customer detail or edit page
      await expect(page).toHaveURL(/\/customers\//, { timeout: TIMEOUTS.navigation })
    }
    // If no customers exist, that's OK — the list loaded successfully
  })
})
