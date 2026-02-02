import { test, expect } from './fixtures/auth.fixture'
import { TIMEOUTS } from './helpers/test-data'

test.describe('Quotes', () => {
  test('quotes list page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/quotes')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/quotes/)
    await expect(page.locator('h1')).toBeVisible({ timeout: TIMEOUTS.load })
  })

  test('navigate to add quote', async ({ authenticatedPage: page }) => {
    await page.goto('/quotes')
    await page.waitForLoadState('domcontentloaded')

    const addButton = page.getByRole('link', { name: /nowa|dodaj|add|new/i }).first()
    await expect(addButton).toBeVisible({ timeout: TIMEOUTS.load })
    await addButton.click()

    await expect(page).toHaveURL(/\/quotes\/add/, { timeout: TIMEOUTS.navigation })
  })

  test('add quote form displays', async ({ authenticatedPage: page }) => {
    await page.goto('/quotes/add')
    await page.waitForLoadState('domcontentloaded')

    // Should show heading
    await expect(page.locator('h1')).toContainText(/ofert/i, { timeout: TIMEOUTS.load })

    // Should have customer select and submit button
    const submitButton = page.getByRole('button', { name: /utwórz|zapisz|create/i }).first()
    await expect(submitButton).toBeVisible()
  })

  test('can add and remove quote items', async ({ authenticatedPage: page }) => {
    await page.goto('/quotes/add')
    await page.waitForLoadState('domcontentloaded')

    // Should have at least one item by default
    const firstItem = page.locator('text=Pozycja 1')
    await expect(firstItem).toBeVisible({ timeout: TIMEOUTS.load })

    // Click add item button
    const addItemButton = page.getByRole('button', { name: /dodaj kolejną|add item/i }).first()
    await expect(addItemButton).toBeVisible()
    await addItemButton.click()

    // Now should have 2 items
    await expect(page.locator('text=Pozycja 2')).toBeVisible({ timeout: TIMEOUTS.short })

    // Remove second item
    const removeButtons = page.getByRole('button', { name: /usuń/i })
    const removeCount = await removeButtons.count()
    if (removeCount > 0) {
      await removeButtons.last().click()
      // Should be back to 1 item
      await expect(page.locator('text=Pozycja 2')).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
  })
})
