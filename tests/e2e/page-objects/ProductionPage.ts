import { type Page, type Locator, expect } from '@playwright/test'

export class ProductionListPage {
  readonly page: Page
  readonly heading: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1')
  }

  async goto() {
    await this.page.goto('/production')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/production/)
  }

  async clickFirstPlan() {
    const firstPlan = this.page.getByRole('link', { name: /PP-/ }).first()
    await expect(firstPlan).toBeVisible({ timeout: 10000 })
    await firstPlan.click()
    await this.page.waitForURL(/\/production\/[a-f0-9-]+/)
  }
}

export class ProductionCreatePage {
  readonly page: Page
  readonly partNameInput: Locator
  readonly materialInput: Locator
  readonly quantityInput: Locator

  constructor(page: Page) {
    this.page = page
    this.partNameInput = page.locator('input[name="part_name"]').or(
      page.getByLabel(/nazwa/i).first()
    )
    this.materialInput = page.locator('input[name="material"]').or(
      page.getByLabel(/materiał/i).first()
    )
    this.quantityInput = page.locator('input[name="quantity"]').or(
      page.getByLabel(/ilość/i).first()
    )
  }

  async goto(orderId?: string) {
    const url = orderId
      ? `/production/create?order_id=${orderId}`
      : '/production/create'
    await this.page.goto(url)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/production\/create/)
  }
}

export class ProductionDetailPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/production\/[a-f0-9-]+/)
  }

  async expectOperationsVisible() {
    // Look for operation-related content
    await expect(
      this.page.locator('text=Operacje').or(this.page.locator('text=Operations'))
    ).toBeVisible({ timeout: 10000 })
  }
}
