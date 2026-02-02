import { type Page, type Locator, expect } from '@playwright/test'

export class OrdersPage {
  readonly page: Page
  readonly heading: Locator
  readonly addOrderButton: Locator
  readonly orderTable: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1')
    this.addOrderButton = page.getByRole('link', { name: /dodaj|nowe|add|new/i }).first()
    this.orderTable = page.locator('table').or(page.locator('[role="table"]'))
  }

  async goto() {
    await this.page.goto('/orders')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/orders/)
  }

  async clickFirstOrder() {
    const firstOrder = this.page.getByRole('link', { name: /ORD-/ }).first()
    await expect(firstOrder).toBeVisible({ timeout: 10000 })
    await firstOrder.click()
    await this.page.waitForURL(/\/orders\/[a-f0-9-]+/)
  }

  async clickAddOrder() {
    await this.addOrderButton.click()
    await this.page.waitForURL(/\/orders\/add/)
  }
}

export class OrderDetailPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/orders\/[a-f0-9-]+/)
    await expect(this.page.locator('h1')).toContainText('Zamówienie #')
  }

  async expectProductionPlansSection() {
    await expect(this.page.locator('text=Plany Produkcji')).toBeVisible()
  }

  async expectTimeTrackingSection() {
    await expect(this.page.locator('text=Time Tracking')).toBeVisible()
  }

  async expectQualityControlSection() {
    await expect(this.page.locator('text=Kontrola Jakości')).toBeVisible()
  }

  async clickCreateProductionPlan() {
    await this.page.getByRole('link', { name: /Utwórz Plan Produkcji/ }).first().click()
    await this.page.waitForURL(/\/production\/create/)
  }

  async clickEditOrder() {
    await this.page.getByRole('link', { name: /Edytuj/ }).first().click()
    await this.page.waitForURL(/\/orders\/.*\/edit/)
  }
}
