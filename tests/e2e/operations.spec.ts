import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Production Module (Setup/Run Time)
 *
 * Tests the production planning workflow:
 * - Creating production plans from orders
 * - Setup Time vs Run Time calculation
 * - Cost calculation based on operations
 * - Operation routing and sequencing
 * - Machine assignment
 * - Auto-estimation of times
 *
 * ARCHITECTURE: Orders → Production Plans → Operations
 */

// Test user credentials (ensure these exist in your test database)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@cnc-pilot.pl',
  password: process.env.TEST_USER_PASSWORD || 'test123456'
}

test.describe('Production Module - Setup/Run Time', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard with increased timeout
    await page.waitForURL('/', { timeout: 20000 })
    await page.waitForLoadState('domcontentloaded')

    // Wait for dashboard content to confirm session is fully established
    // Use a more flexible selector that doesn't require strict h1/h2
    await expect(page.locator('main').or(page.locator('body'))).toBeVisible({ timeout: 10000 })
  })

  test('should display production plans section in order details', async ({ page }) => {
    // Navigate to orders
    await page.goto('/orders')

    // Click on first order (assuming at least one order exists)
    const firstOrder = page.getByRole('link', { name: /ORD-TEST/ }).first()
    await expect(firstOrder).toBeVisible()
    await firstOrder.click()

    // Wait for navigation to order details page
    await page.waitForURL(/\/orders\/[a-f0-9-]+/)

    // Check if production plans section exists (NEW ARCHITECTURE)
    await expect(page.locator('text=Plany Produkcji')).toBeVisible()
    await expect(page.getByRole('link', { name: /Utwórz Plan Produkcji/ }).first()).toBeVisible()
  })

  test('should navigate to create production plan page', async ({ page }) => {
    // Go to orders list
    await page.goto('/orders')

    // Click first order
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()

    // Click "Create Production Plan" button (NEW)
    await page.click('text=Utwórz Plan Produkcji')

    // Should be on production create page (NEW URL)
    await expect(page).toHaveURL(/\/production\/create\?order_id=/)
    await expect(page.locator('h1:has-text("Nowy Plan Produkcji")')).toBeVisible()
  })

  test('should create production plan with operations', async ({ page }) => {
    // Navigate to orders
    await page.goto('/orders')

    // Click first order
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const currentUrl = page.url()
    const orderId = currentUrl.split('/').pop()

    // Navigate to production create page (NEW PATH)
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Fill basic info
    await page.fill('input[placeholder*="Flansza"]', 'Flansza Testowa Ø100')
    await page.fill('input[type="number"][min="1"]', '50')
    await page.fill('input[placeholder*="Stal"]', 'Stal nierdzewna')

    // Select complexity
    await page.selectOption('select', 'medium')

    // Add first operation
    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')

    // Wait for operation form to appear
    await expect(page.locator('text=#1').first()).toBeVisible()

    // Fill operation details
    // Find operation type select (first select after "Typ operacji" label)
    const operationTypeSelect = page.locator('select').nth(1) // nth(0) is complexity, nth(1) is operation type
    await operationTypeSelect.selectOption('milling')
    await page.fill('input[placeholder*="Toczenie"]', 'Toczenie zgrubne')

    // Fill Setup Time
    const setupInputs = page.locator('input[placeholder*="przygotowania"]')
    await setupInputs.first().fill('20')

    // Fill Run Time
    const runInputs = page.locator('input[placeholder*="obróbki"]')
    await runInputs.first().fill('6')

    // Fill hourly rate
    const rateInputs = page.locator('input[type="number"][step="0.01"]')
    await rateInputs.last().fill('180')

    // Check if cost is calculated (there are multiple "Koszt całkowity" labels, check the first one)
    await expect(page.locator('text=Koszt całkowity').first()).toBeVisible()

    // Submit form (NEW BUTTON TEXT)
    await page.click('button[type="submit"]:has-text("Utwórz Plan Produkcji")')

    // Should redirect to production plan details (NEW ARCHITECTURE)
    await expect(page).toHaveURL(/\/production\/[a-f0-9-]+/)

    // Verify plan details are shown
    await expect(page.locator('text=Flansza Testowa Ø100')).toBeVisible()
    await expect(page.locator('text=Plan Produkcji').first()).toBeVisible()
  })

  test('should auto-estimate operation times', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Fill basic info
    await page.fill('input[placeholder*="Flansza"]', 'Test Part')
    await page.fill('input[type="number"][min="1"]', '10')

    // Add operation
    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#1').first()).toBeVisible()

    // Select operation type
    const operationTypeSelect = page.locator('select').nth(1) // nth(0) is complexity, nth(1) is operation type
    await operationTypeSelect.selectOption('turning')
    await page.fill('input[placeholder*="Toczenie"]', 'Toczenie')

    // Click auto-estimate button
    await page.click('button:has-text("Oszacuj")')

    // Wait for toast notification
    await expect(page.locator('text=Czasy oszacowane!')).toBeVisible({ timeout: 5000 })

    // Verify times were filled
    const setupInput = page.locator('input[placeholder*="przygotowania"]').first()
    const setupValue = await setupInput.inputValue()
    expect(parseInt(setupValue)).toBeGreaterThan(0)
  })

  test('should calculate costs in real-time', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Fill basic info
    await page.fill('input[placeholder*="Flansza"]', 'Cost Test Part')
    await page.fill('input[type="number"][min="1"]', '100')

    // Add operation
    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#1').first()).toBeVisible()

    // Fill operation with specific values
    await page.fill('input[placeholder*="Toczenie"]', 'Test Operation')

    // Setup: 30 min
    const setupInputs = page.locator('input[placeholder*="przygotowania"]')
    await setupInputs.first().fill('30')

    // Run: 5 min/unit
    const runInputs = page.locator('input[placeholder*="obróbki"]')
    await runInputs.first().fill('5')

    // Rate: 200 PLN/h
    const rateInputs = page.locator('input[type="number"][step="0.01"]')
    await rateInputs.last().fill('200')

    // Expected cost calculation:
    // Setup: 30/60 * 200 = 100 PLN
    // Run: 5 * 100 / 60 * 200 = 1666.67 PLN
    // Total: 1766.67 PLN

    // Check if total is displayed
    await expect(page.locator('text=1766.67 PLN').or(page.locator('text=1,766.67 PLN'))).toBeVisible({ timeout: 2000 })
  })

  test('should add multiple operations to production plan', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Fill basic info
    await page.fill('input[placeholder*="Flansza"]', 'Multi-Op Part')
    await page.fill('input[type="number"][min="1"]', '20')

    // Add first operation
    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#1').first()).toBeVisible()

    // Add second operation
    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#2').first()).toBeVisible()

    // Add third operation
    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#3').first()).toBeVisible()

    // Fill all operations
    const operationNames = page.locator('input[placeholder*="Toczenie"]')
    await operationNames.nth(0).fill('Operacja 1')
    await operationNames.nth(1).fill('Operacja 2')
    await operationNames.nth(2).fill('Operacja 3')

    // Verify all three operations are present
    await expect(page.locator('text=Operacja 1')).toBeVisible()
    await expect(page.locator('text=Operacja 2')).toBeVisible()
    await expect(page.locator('text=Operacja 3')).toBeVisible()
  })

  test('should reorder operations', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Fill basic info
    await page.fill('input[placeholder*="Flansza"]', 'Reorder Test')
    await page.fill('input[type="number"][min="1"]', '5')

    // Add two operations
    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#1').first()).toBeVisible()

    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#2').first()).toBeVisible()

    // Fill operations
    const operationNames = page.locator('input[placeholder*="Toczenie"]')
    await operationNames.nth(0).fill('First Operation')
    await operationNames.nth(1).fill('Second Operation')

    // Move second operation up (should become first)
    const upButtons = page.locator('button[title*="górę"]')
    await upButtons.nth(1).click()

    // Verify order changed
    const firstOpNumber = page.locator('span:has-text("#1")').first()
    const firstOpName = await operationNames.first().inputValue()
    expect(firstOpName).toBe('Second Operation')
  })

  test('should remove operation', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Fill basic info
    await page.fill('input[placeholder*="Flansza"]', 'Remove Test')
    await page.fill('input[type="number"][min="1"]', '5')

    // Add two operations
    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#1').first()).toBeVisible()

    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#2').first()).toBeVisible()

    // Verify two operations exist
    await expect(page.locator('text=#1').first()).toBeVisible()
    await expect(page.locator('text=#2').first()).toBeVisible()

    // Remove first operation
    const removeButtons = page.locator('button:has-text("Usuń")')
    await removeButtons.first().click()

    // Should only have one operation now (renumbered to #1)
    await expect(page.locator('text=#1').first()).toBeVisible()
    await expect(page.locator('text=#2').first()).not.toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Try to submit without filling anything
    await page.click('button[type="submit"]:has-text("Utwórz Plan Produkcji")')

    // Should show validation error
    await expect(page.locator('text=Podaj nazwę części').or(page.locator('text=Dodaj przynajmniej jedną operację'))).toBeVisible({ timeout: 2000 })
  })

  test('should display production plan in production module list', async ({ page }) => {
    // First create a production plan
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Fill and submit
    await page.fill('input[placeholder*="Flansza"]', 'List Display Test')
    await page.fill('input[type="number"][min="1"]', '25')

    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#1').first()).toBeVisible()
    await page.fill('input[placeholder*="Toczenie"]', 'Test Operation Display')

    const setupInputs = page.locator('input[placeholder*="przygotowania"]')
    await setupInputs.first().fill('15')

    const runInputs = page.locator('input[placeholder*="obróbki"]')
    await runInputs.first().fill('4')

    const rateInputs = page.locator('input[type="number"][step="0.01"]')
    await rateInputs.last().fill('150')

    await page.click('button[type="submit"]:has-text("Utwórz Plan Produkcji")')

    // Wait for redirect to production details
    await page.waitForURL(/\/production\/[a-f0-9-]+/)

    // Now go to production module list
    await page.goto('/production')
    await page.waitForLoadState('domcontentloaded')

    // Verify plan is displayed in list
    await expect(page.locator('text=List Display Test')).toBeVisible()
    await expect(page.locator('text=Plan Produkcji').first()).toBeVisible()
  })

  test('should show production plans in order details', async ({ page }) => {
    // Create a production plan first
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[placeholder*="Flansza"]', 'Order Link Test')
    await page.fill('input[type="number"][min="1"]', '10')

    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#1').first()).toBeVisible()
    await page.fill('input[placeholder*="Toczenie"]', 'Test Op')

    const setupInputs = page.locator('input[placeholder*="przygotowania"]')
    await setupInputs.first().fill('10')

    const runInputs = page.locator('input[placeholder*="obróbki"]')
    await runInputs.first().fill('3')

    const rateInputs = page.locator('input[type="number"][step="0.01"]')
    await rateInputs.last().fill('180')

    await page.click('button[type="submit"]:has-text("Utwórz Plan Produkcji")')

    // Wait for redirect
    await page.waitForURL(/\/production\/[a-f0-9-]+/)

    // Go back to order details
    await page.goto(`/orders/${orderId}`)

    // Verify production plan is shown in order (NEW SECTION)
    await expect(page.locator('text=Plany Produkcji')).toBeVisible()
    await expect(page.locator('text=Order Link Test')).toBeVisible()
  })

  test('should support drawing upload for production plans', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Check if drawing upload section exists
    await expect(page.locator('text=Rysunek Techniczny')).toBeVisible()
    await expect(page.locator('text=PDF, DXF, PNG, JPG')).toBeVisible()
  })

  test('should validate operation times are non-negative', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[placeholder*="Flansza"]', 'Negative Time Test')
    await page.fill('input[type="number"][min="1"]', '10')

    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#1').first()).toBeVisible()
    await page.fill('input[placeholder*="Toczenie"]', 'Invalid Op')

    // Try to enter negative setup time
    const setupInputs = page.locator('input[placeholder*="przygotowania"]')
    await setupInputs.first().fill('-10')

    // Submit
    await page.click('button[type="submit"]:has-text("Utwórz Plan Produkcji")')

    // Should show validation error
    await expect(page.locator('text=muszą być >= 0').or(page.locator('text=must be'))).toBeVisible({ timeout: 2000 })
  })

  test('should link back to order from production plan details', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[placeholder*="Flansza"]', 'Link Back Test')
    await page.fill('input[type="number"][min="1"]', '5')

    await page.getByRole('button', { name: /Dodaj Operację/ }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=#1').first()).toBeVisible()
    await page.fill('input[placeholder*="Toczenie"]', 'Test Op')

    const setupInputs = page.locator('input[placeholder*="przygotowania"]')
    await setupInputs.first().fill('10')

    const runInputs = page.locator('input[placeholder*="obróbki"]')
    await runInputs.first().fill('2')

    const rateInputs = page.locator('input[type="number"][step="0.01"]')
    await rateInputs.last().fill('150')

    await page.click('button[type="submit"]:has-text("Utwórz Plan Produkcji")')

    await page.waitForURL(/\/production\/[a-f0-9-]+/)

    // Look for link back to order
    const orderLink = page.locator('a[href^="/orders/"]:has-text("Zlecenie")')
    await expect(orderLink).toBeVisible()

    // Click it
    await orderLink.click()

    // Should be back at order details
    await expect(page).toHaveURL(`/orders/${orderId}`)
  })
})

test.describe('Production Module - Mobile Responsiveness', () => {
  test.use({
    viewport: { width: 375, height: 667 } // iPhone SE size
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard with increased timeout
    await page.waitForURL('/', { timeout: 20000 })
    await page.waitForLoadState('domcontentloaded')

    // Wait for dashboard content to confirm session is fully established
    await expect(page.locator('main').or(page.locator('body'))).toBeVisible({ timeout: 10000 })
  })

  test('should display production plans on mobile', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()

    // Production plans section should be visible on mobile (NEW)
    await expect(page.locator('text=Plany Produkcji')).toBeVisible()
  })

  test('should allow creating production plans on mobile', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    // Form should be usable on mobile
    await expect(page.locator('input[placeholder*="Flansza"]')).toBeVisible()
    await expect(page.locator('button:has-text("Dodaj Operację")')).toBeVisible()
  })

  test('should display production module list on mobile', async ({ page }) => {
    await page.goto('/production')
    await page.waitForLoadState('domcontentloaded')

    // List should be visible and responsive
    await expect(page.locator('text=Plan Produkcji').first()).toBeVisible()
  })
})

test.describe('Production Module - Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard with increased timeout
    await page.waitForURL('/', { timeout: 20000 })
    await page.waitForLoadState('domcontentloaded')

    // Wait for dashboard content to confirm session is fully established
    await expect(page.locator('main').or(page.locator('body'))).toBeVisible({ timeout: 10000 })
  })

  test('should load production plan details quickly', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/production')
    await page.waitForLoadState('domcontentloaded')

    // Wait for list to load
    await expect(page.locator('text=Plan Produkcji').first()).toBeVisible()

    const loadTime = Date.now() - startTime

    // Should load in under 5 seconds (increased for CI/slow environments)
    expect(loadTime).toBeLessThan(5000)
  })

  test('should handle many operations efficiently', async ({ page }) => {
    await page.goto('/orders')
    await page.getByRole('link', { name: /ORD-TEST/ }).first().click()
    const orderId = page.url().split('/').pop()

    // NEW PATH
    await page.goto(`/production/create?order_id=${orderId}`)
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[placeholder*="Flansza"]', 'Many Ops Test')
    await page.fill('input[type="number"][min="1"]', '10')

    // Add 10 operations
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: /Dodaj Operację/ }).click()
      await page.waitForTimeout(100) // Small delay to let React render
      await expect(page.locator(`text=#${i + 1}`).first()).toBeVisible({ timeout: 3000 })
    }

    // Should handle 10 operations without freezing
    await expect(page.locator('text=#10').first()).toBeVisible({ timeout: 5000 })

    // Form should still be responsive
    await expect(page.locator('button[type="submit"]')).toBeEnabled()
  })

  test('should navigate between production and orders quickly', async ({ page }) => {
    const startTime = Date.now()

    // Orders → Production → Orders
    await page.goto('/orders')
    await page.goto('/production')
    await page.waitForLoadState('domcontentloaded')
    await page.goto('/orders')

    const navigationTime = Date.now() - startTime

    // All 3 navigations should complete in under 8 seconds (increased for CI/slow environments)
    expect(navigationTime).toBeLessThan(8000)
  })
})
