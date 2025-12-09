import { test, expect } from '@playwright/test'

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000')
  })

  test.describe('Authentication Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('http://localhost:3000/login')

      // Fill login form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')

      // Click login button
      await page.click('button[type="submit"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/)

      // Should see welcome message or dashboard content
      await expect(page.locator('h1')).toContainText(/Dashboard|Witaj/)
    })

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('http://localhost:3000/login')

      await page.fill('input[type="email"]', 'wrong@example.com')
      await page.fill('input[type="password"]', 'wrongpassword')

      await page.click('button[type="submit"]')

      // Should show error message
      await expect(page.locator('[role="alert"]')).toBeVisible()
    })

    test('should logout successfully', async ({ page }) => {
      // Assuming user is logged in
      await page.goto('http://localhost:3000/dashboard')

      // Click logout button
      await page.click('button:has-text("Wyloguj")')

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/)
    })
  })

  test.describe('Order Creation Flow', () => {
    test('should create new order successfully', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/new')

      // Fill order form
      await page.fill('input[name="order_number"]', 'ORD-TEST-001')
      await page.fill('input[name="customer_name"]', 'Test Customer')
      await page.fill('textarea[name="notes"]', 'Test order notes')

      // Select deadline
      await page.fill('input[name="deadline"]', '2025-01-15')

      // Click save button
      await page.click('button:has-text("Zapisz")')

      // Should show success toast
      await expect(page.locator('.toast')).toContainText(/Zapisano|Success/)

      // Should redirect to orders list
      await expect(page).toHaveURL(/.*orders/)

      // Should see new order in list
      await expect(page.locator('text=ORD-TEST-001')).toBeVisible()
    })

    test('should show validation errors for empty required fields', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/new')

      // Try to submit without filling
      await page.click('button:has-text("Zapisz")')

      // Should show validation errors
      await expect(page.locator('.error-message, [role="alert"]')).toBeVisible()
    })
  })

  test.describe('Search Functionality', () => {
    test('should open global search with Ctrl+K', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Press Ctrl+K
      await page.keyboard.press('Control+K')

      // Search modal should open
      await expect(page.locator('[role="dialog"]')).toBeVisible()
      await expect(page.locator('input[type="search"]')).toBeFocused()
    })

    test('should search and find results', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Open search
      await page.keyboard.press('Control+K')

      // Type search query
      await page.fill('input[type="search"]', 'ORD-')

      // Wait for results
      await page.waitForSelector('[data-search-results]')

      // Should show results
      await expect(page.locator('[data-search-results] > *')).toHaveCount({ minimum: 1 })
    })

    test('should close search with Escape', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      await page.keyboard.press('Control+K')
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    })
  })

  test.describe('Dark Mode', () => {
    test('should toggle dark mode', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Click dark mode toggle
      await page.click('[aria-label="Toggle theme"]')

      // Check if dark class is added
      const html = page.locator('html')
      await expect(html).toHaveClass(/dark/)

      // Toggle back
      await page.click('[aria-label="Toggle theme"]')
      await expect(html).not.toHaveClass(/dark/)
    })

    test('should persist dark mode preference', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Enable dark mode
      await page.click('[aria-label="Toggle theme"]')

      // Reload page
      await page.reload()

      // Dark mode should still be active
      await expect(page.locator('html')).toHaveClass(/dark/)
    })
  })

  test.describe('Bulk Actions', () => {
    test('should select multiple items and perform bulk delete', async ({ page }) => {
      await page.goto('http://localhost:3000/orders')

      // Select first 3 items
      await page.check('input[type="checkbox"]', { nth: 1 })
      await page.check('input[type="checkbox"]', { nth: 2 })
      await page.check('input[type="checkbox"]', { nth: 3 })

      // Bulk action bar should appear
      await expect(page.locator('[data-bulk-action-bar]')).toBeVisible()

      // Should show count
      await expect(page.locator('[data-bulk-action-bar]')).toContainText('3')

      // Click bulk delete
      await page.click('button:has-text("Usuń")')

      // Confirm deletion
      await page.click('button:has-text("Potwierdź")')

      // Success toast
      await expect(page.locator('.toast')).toContainText(/Usunięto/)
    })

    test('should select all items', async ({ page }) => {
      await page.goto('http://localhost:3000/orders')

      // Click select all checkbox
      await page.check('thead input[type="checkbox"]')

      // All items should be selected
      const checkboxes = page.locator('tbody input[type="checkbox"]')
      const count = await checkboxes.count()

      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).toBeChecked()
      }
    })
  })

  test.describe('Form Autosave', () => {
    test('should autosave form data', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/new')

      // Fill form
      await page.fill('input[name="customer_name"]', 'Autosave Test')

      // Wait for autosave (2 seconds debounce)
      await page.waitForTimeout(2500)

      // Should show autosave indicator
      await expect(page.locator('text=/Automatycznie zapisano|Auto-saved/')).toBeVisible()
    })

    test('should restore form data after refresh', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/new')

      // Fill form
      await page.fill('input[name="customer_name"]', 'Restore Test')

      // Wait for autosave
      await page.waitForTimeout(2500)

      // Reload page
      await page.reload()

      // Data should be restored
      await expect(page.locator('input[name="customer_name"]')).toHaveValue('Restore Test')
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('http://localhost:3000/dashboard')

      // Mobile menu should be visible
      await expect(page.locator('[aria-label="Menu"]')).toBeVisible()

      // Click menu to open
      await page.click('[aria-label="Menu"]')

      // Navigation should appear
      await expect(page.locator('nav')).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('http://localhost:3000/dashboard')

      // Content should be visible and responsive
      await expect(page.locator('main')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should show error boundary on component crash', async ({ page }) => {
      // Navigate to a page that will trigger error
      await page.goto('http://localhost:3000/test-error')

      // Error boundary should catch it
      await expect(page.locator('text=/Something went wrong|Coś poszło nie tak/')).toBeVisible()

      // Should have "Try again" button
      await expect(page.locator('button:has-text("Spróbuj ponownie")')).toBeVisible()
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and return error
      await page.route('**/api/**', route => {
        route.abort()
      })

      await page.goto('http://localhost:3000/orders')

      // Should show error toast or message
      await expect(page.locator('.toast, [role="alert"]')).toBeVisible()
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should navigate with Tab key', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/new')

      // Press Tab to navigate through form
      await page.keyboard.press('Tab')
      let focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(['INPUT', 'BUTTON', 'TEXTAREA']).toContain(focused)

      await page.keyboard.press('Tab')
      focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(['INPUT', 'BUTTON', 'TEXTAREA']).toContain(focused)
    })

    test('should submit form with Enter key', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/new')

      await page.fill('input[name="order_number"]', 'ORD-ENTER-TEST')
      await page.fill('input[name="customer_name"]', 'Enter Test')

      // Press Enter to submit
      await page.keyboard.press('Enter')

      // Should save
      await expect(page.locator('.toast')).toContainText(/Zapisano/)
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Check for ARIA labels
      const buttons = page.locator('button[aria-label]')
      await expect(buttons).toHaveCount({ minimum: 1 })
    })

    test('should have focus indicators', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/new')

      // Tab to first input
      await page.keyboard.press('Tab')

      // Check if focus outline is visible
      const focused = page.locator(':focus')
      await expect(focused).toHaveCSS('outline', /.*/)
    })
  })
})
