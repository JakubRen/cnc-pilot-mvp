import { type Page, type Locator, expect } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly mainContent: Locator
  readonly ordersLink: Locator
  readonly inventoryLink: Locator
  readonly productionLink: Locator

  constructor(page: Page) {
    this.page = page
    this.mainContent = page.locator('main').or(page.locator('[role="main"]'))
    this.ordersLink = page.locator('a[href="/orders"]').first()
    this.inventoryLink = page.locator('a[href="/inventory"]').first()
    this.productionLink = page.locator('a[href="/production"]').first()
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async expectLoaded() {
    await expect(this.mainContent).toBeVisible({ timeout: 10000 })
  }

  async navigateToOrders() {
    await this.ordersLink.click()
    await this.page.waitForURL(/\/orders/)
  }

  async navigateToProduction() {
    await this.productionLink.click()
    await this.page.waitForURL(/\/production/)
  }
}
