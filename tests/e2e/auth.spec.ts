import { test, expect } from '@playwright/test'
import { LoginPage } from './page-objects/LoginPage'
import { TEST_USER } from './helpers/test-data'

test.describe('Login Page', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('displays login form correctly', async () => {
    await loginPage.expectVisible()
  })

  test('stays on login page when submitting empty form', async () => {
    await loginPage.submitButton.click()
    await loginPage.page.waitForTimeout(500)
    await loginPage.expectStillOnLogin()
  })

  test('stays on login page with invalid email format', async () => {
    await loginPage.login('invalid-email', 'password123')
    await loginPage.page.waitForTimeout(500)
    await loginPage.expectStillOnLogin()
  })

  test('stays on login page with short password', async () => {
    await loginPage.login('test@example.com', '123')
    await loginPage.page.waitForTimeout(500)
    await loginPage.expectStillOnLogin()
  })

  test('has link to register page', async () => {
    await expect(loginPage.registerLink).toBeVisible()
    await loginPage.registerLink.click()
    await expect(loginPage.page).toHaveURL(/.*register/)
  })

  test('has link to forgot password page', async () => {
    await expect(loginPage.forgotPasswordLink).toBeVisible()
  })

  test('logs in successfully with valid credentials', async () => {
    await loginPage.login(TEST_USER.email, TEST_USER.password)
    await expect(loginPage.page).toHaveURL('/', { timeout: 20000 })
  })
})

test.describe('Register Page', () => {
  test('displays register form correctly', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('has link to login page', async ({ page }) => {
    await page.goto('/register')
    const loginLink = page.locator('a[href="/login"]')
    await expect(loginLink).toBeVisible()
  })
})
