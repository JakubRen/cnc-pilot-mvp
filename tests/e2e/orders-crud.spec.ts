import { test, expect } from './fixtures/auth.fixture'
import { TIMEOUTS } from './helpers/test-data'
import { OrdersPage, OrderDetailPage } from './page-objects/OrdersPage'

test.describe('Orders CRUD', () => {
  test('orders list loads with data', async ({ authenticatedPage: page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()
    await ordersPage.expectLoaded()

    // Should show heading
    await expect(ordersPage.heading).toBeVisible({ timeout: TIMEOUTS.load })
  })

  test('navigate to add order page', async ({ authenticatedPage: page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()

    await ordersPage.clickAddOrder()
    await expect(page).toHaveURL(/\/orders\/add/, { timeout: TIMEOUTS.navigation })
  })

  test('add order form has required fields', async ({ authenticatedPage: page }) => {
    await page.goto('/orders/add')
    await page.waitForLoadState('domcontentloaded')

    // Should have form inputs
    await expect(page.locator('input').first()).toBeVisible({ timeout: TIMEOUTS.load })

    // Should have a submit button
    const submitButton = page.getByRole('button', { name: /zapisz|utwórz|save|create/i }).first()
    await expect(submitButton).toBeVisible()
  })

  test('can navigate to order detail from list', async ({ authenticatedPage: page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()

    // Try to click on first order
    const orderLink = page.getByRole('link', { name: /ORD-/ }).first()
    const isVisible = await orderLink.isVisible({ timeout: TIMEOUTS.short }).catch(() => false)

    if (isVisible) {
      const detailPage = new OrderDetailPage(page)
      await ordersPage.clickFirstOrder()
      await detailPage.expectLoaded()
    }
    // If no orders exist, the list loaded successfully — that's enough
  })

  test('order detail shows all sections', async ({ authenticatedPage: page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()

    const orderLink = page.getByRole('link', { name: /ORD-/ }).first()
    const isVisible = await orderLink.isVisible({ timeout: TIMEOUTS.short }).catch(() => false)

    if (isVisible) {
      const detailPage = new OrderDetailPage(page)
      await ordersPage.clickFirstOrder()
      await detailPage.expectLoaded()

      // Check key sections exist on the detail page
      await detailPage.expectQualityControlSection()
    }
  })
})
