import { type Page, type Locator, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly registerLink: Locator
  readonly forgotPasswordLink: Locator
  readonly heading: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('input[type="email"]')
    this.passwordInput = page.locator('input[type="password"]')
    this.submitButton = page.locator('button[type="submit"]')
    this.registerLink = page.locator('a[href="/register"]')
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]')
    this.heading = page.locator('h1')
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async expectVisible() {
    await expect(this.heading).toContainText('CNC')
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.submitButton).toBeVisible()
  }

  async expectStillOnLogin() {
    await expect(this.page).toHaveURL(/.*login/)
  }
}
