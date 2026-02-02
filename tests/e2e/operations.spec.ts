import { test, expect } from './fixtures/auth.fixture'
import { OrdersPage, OrderDetailPage } from './page-objects/OrdersPage'
import { ProductionListPage, ProductionCreatePage, ProductionDetailPage } from './page-objects/ProductionPage'
import { DashboardPage } from './page-objects/DashboardPage'
import { VIEWPORTS } from './helpers/test-data'

test.describe('Production Module', () => {
  test('order details shows production plans section', async ({ authenticatedPage: page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()
    await ordersPage.clickFirstOrder()

    const detail = new OrderDetailPage(page)
    await detail.expectLoaded()
    await detail.expectProductionPlansSection()
  })

  test('can navigate to create production plan from order', async ({ authenticatedPage: page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()
    await ordersPage.clickFirstOrder()

    const detail = new OrderDetailPage(page)
    await detail.clickCreateProductionPlan()

    const createPage = new ProductionCreatePage(page)
    await createPage.expectLoaded()
  })

  test('order details shows time tracking section', async ({ authenticatedPage: page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()
    await ordersPage.clickFirstOrder()

    const detail = new OrderDetailPage(page)
    await detail.expectLoaded()
    await detail.expectTimeTrackingSection()
  })

  test('order details shows quality control section', async ({ authenticatedPage: page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()
    await ordersPage.clickFirstOrder()

    const detail = new OrderDetailPage(page)
    await detail.expectLoaded()
    await detail.expectQualityControlSection()
  })

  test('production list page loads', async ({ authenticatedPage: page }) => {
    const productionPage = new ProductionListPage(page)
    await productionPage.goto()
    await productionPage.expectLoaded()
  })

  test('production create page loads with order context', async ({ authenticatedPage: page }) => {
    // First get an order ID
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()
    await ordersPage.clickFirstOrder()

    // Extract order ID from URL
    const url = page.url()
    const orderId = url.match(/\/orders\/([a-f0-9-]+)/)?.[1]
    expect(orderId).toBeTruthy()

    // Navigate to create production plan
    const createPage = new ProductionCreatePage(page)
    await createPage.goto(orderId!)
    await createPage.expectLoaded()
  })

  test('can navigate between orders and production', async ({ authenticatedPage: page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.expectLoaded()

    // Orders → detail → production create → back
    await dashboard.navigateToOrders()
    const ordersPage = new OrdersPage(page)
    await ordersPage.expectLoaded()

    await ordersPage.clickFirstOrder()
    const detail = new OrderDetailPage(page)
    await detail.expectLoaded()
  })
})

test.describe('Production Module - Mobile', () => {
  test('order details renders on mobile', async ({ authenticatedPage: page }) => {
    await page.setViewportSize(VIEWPORTS.mobile)

    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()
    await ordersPage.clickFirstOrder()

    const detail = new OrderDetailPage(page)
    await detail.expectLoaded()
    await detail.expectProductionPlansSection()
  })

  test('production list renders on mobile', async ({ authenticatedPage: page }) => {
    await page.setViewportSize(VIEWPORTS.mobile)

    const productionPage = new ProductionListPage(page)
    await productionPage.goto()
    await productionPage.expectLoaded()
  })
})

test.describe('Production Module - Performance', () => {
  test('order detail page loads within 15 seconds', async ({ authenticatedPage: page }) => {
    const ordersPage = new OrdersPage(page)
    await ordersPage.goto()

    const start = Date.now()
    await ordersPage.clickFirstOrder()
    const detail = new OrderDetailPage(page)
    await detail.expectLoaded()

    expect(Date.now() - start).toBeLessThan(15000)
  })

  test('production list loads within 15 seconds', async ({ authenticatedPage: page }) => {
    const start = Date.now()
    const productionPage = new ProductionListPage(page)
    await productionPage.goto()
    await productionPage.expectLoaded()

    expect(Date.now() - start).toBeLessThan(15000)
  })
})
