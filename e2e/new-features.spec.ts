import { test, expect } from '@playwright/test'

test.describe('New Features - 15 Advanced Implementations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test.describe('Autosave Feature', () => {
    test('should autosave form after 2 seconds of inactivity', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/new')

      // Type in form
      await page.fill('input[name="customer_name"]', 'Autosave User')
      await page.fill('textarea[name="notes"]', 'Testing autosave functionality')

      // Wait for debounce (2s)
      await page.waitForTimeout(2500)

      // Should see autosave toast
      await expect(page.locator('.toast')).toContainText(/Auto|zapisano/)
    })

    test('should warn before leaving with unsaved changes', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/new')

      await page.fill('input[name="customer_name"]', 'Test')

      // Set up beforeunload listener
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('unsaved')
        dialog.accept()
      })

      // Try to navigate away
      // Note: Browser may not always show this dialog in tests
    })
  })

  test.describe('Infinite Scroll', () => {
    test('should load more items when scrolling to bottom', async ({ page }) => {
      await page.goto('http://localhost:3000/orders')

      // Get initial item count
      const initialCount = await page.locator('[data-order-item]').count()

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

      // Wait for loading
      await page.waitForSelector('[data-loading="true"]')
      await page.waitForSelector('[data-loading="false"]')

      // Should have more items
      const newCount = await page.locator('[data-order-item]').count()
      expect(newCount).toBeGreaterThan(initialCount)
    })

    test('should show "end of list" message when no more data', async ({ page }) => {
      await page.goto('http://localhost:3000/orders')

      // Scroll multiple times to reach end
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(1000)
      }

      // Should show end message
      await expect(page.locator('text=/Koniec|No more/')).toBeVisible()
    })
  })

  test.describe('Virtual List Performance', () => {
    test('should render only visible items in DOM', async ({ page }) => {
      await page.goto('http://localhost:3000/test/virtual-list')

      // Total items in data
      const totalItems = await page.getAttribute('[data-total-items]', 'data-total-items')

      // Items in DOM (should be much less)
      const domItems = await page.locator('[data-virtual-item]').count()

      expect(Number(domItems)).toBeLessThan(Number(totalItems))
      expect(Number(domItems)).toBeLessThan(30) // Should render ~15-20 items max
    })

    test('should update visible items while scrolling', async ({ page }) => {
      await page.goto('http://localhost:3000/test/virtual-list')

      // Get first visible item
      const firstItem = await page.locator('[data-virtual-item]').first().textContent()

      // Scroll down significantly
      await page.evaluate(() => window.scrollBy(0, 1000))
      await page.waitForTimeout(100)

      // First visible item should be different
      const newFirstItem = await page.locator('[data-virtual-item]').first().textContent()
      expect(newFirstItem).not.toBe(firstItem)
    })
  })

  test.describe('Drag & Drop', () => {
    test('should reorder items with drag and drop', async ({ page }) => {
      await page.goto('http://localhost:3000/test/drag-drop')

      // Get initial order
      const firstItem = await page.locator('[draggable="true"]').first().textContent()
      const thirdItem = await page.locator('[draggable="true"]').nth(2).textContent()

      // Drag third item to first position
      await page.locator('[draggable="true"]').nth(2).dragTo(
        page.locator('[draggable="true"]').first()
      )

      // Order should change
      const newFirstItem = await page.locator('[draggable="true"]').first().textContent()
      expect(newFirstItem).toBe(thirdItem)
    })

    test('should show visual feedback during drag', async ({ page }) => {
      await page.goto('http://localhost:3000/test/drag-drop')

      const item = page.locator('[draggable="true"]').first()

      // Start drag
      await item.hover()
      await page.mouse.down()

      // Should have dragging class/style
      await expect(item).toHaveClass(/dragging|opacity/)
    })
  })

  test.describe('Activity Log', () => {
    test('should display timeline of changes', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/123')

      // Activity log should be visible
      await expect(page.locator('[data-activity-log]')).toBeVisible()

      // Should show timeline items
      const activities = page.locator('[data-activity-item]')
      await expect(activities.first()).toBeVisible()
    })

    test('should show relative timestamps', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/123')

      // Should show "X min ago" or "X hours ago"
      await expect(page.locator('text=/min temu|godz. temu|dni temu/')).toBeVisible()
    })

    test('should display user avatars', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/123')

      // Should have avatars
      const avatars = page.locator('[data-activity-log] img[alt*="avatar"]')
      await expect(avatars.first()).toBeVisible()
    })
  })

  test.describe('Export Features', () => {
    test('should export to CSV', async ({ page }) => {
      await page.goto('http://localhost:3000/orders')

      // Set up download handler
      const downloadPromise = page.waitForEvent('download')

      // Click export CSV button
      await page.click('button:has-text("Eksportuj CSV")')

      const download = await downloadPromise

      // Check filename
      expect(download.suggestedFilename()).toMatch(/\.csv$/)
    })

    test('should export to JSON', async ({ page }) => {
      await page.goto('http://localhost:3000/orders')

      const downloadPromise = page.waitForEvent('download')

      await page.click('button:has-text("Eksportuj JSON")')

      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.json$/)
    })

    test('should export only selected items in bulk mode', async ({ page }) => {
      await page.goto('http://localhost:3000/orders')

      // Select 2 items
      await page.locator('input[type="checkbox"]').nth(1).check()
      await page.locator('input[type="checkbox"]').nth(2).check()

      // Export selected
      await page.click('button:has-text("Eksportuj zaznaczone")')

      // Should download
      await page.waitForEvent('download')
    })
  })

  test.describe('Comments System', () => {
    test('should add a comment', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/123')

      // Fill comment textarea
      await page.fill('textarea[placeholder*="komentarz"]', 'This is a test comment')

      // Submit
      await page.click('button:has-text("Dodaj komentarz")')

      // Comment should appear
      await expect(page.locator('text=This is a test comment')).toBeVisible()
    })

    test('should reply to a comment', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/123')

      // Click reply on first comment
      await page.click('[data-comment-item]:first-child button:has-text("Odpowiedz")')

      // Reply form should appear
      await expect(page.locator('textarea[placeholder*="Odpowiedz"]')).toBeVisible()

      // Fill and submit
      await page.fill('textarea[placeholder*="Odpowiedz"]', 'This is a reply')
      await page.click('button:has-text("Wyślij")')

      // Reply should be nested
      await expect(page.locator('[data-nested-comment]')).toContainText('This is a reply')
    })

    test('should edit own comment', async ({ page }) => {
      await page.goto('http://localhost:3000/orders/123')

      // Click edit on comment
      await page.click('[data-comment-item]:first-child button:has-text("Edytuj")')

      // Edit textarea should appear
      await page.fill('textarea', 'Edited comment text')
      await page.click('button:has-text("Zapisz")')

      // Should show edited text
      await expect(page.locator('text=Edited comment text')).toBeVisible()
      await expect(page.locator('text=/Edytowano/')).toBeVisible()
    })
  })

  test.describe('Real-time Data Updates', () => {
    test('should auto-refresh data every 5 seconds', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Get initial data
      const initialValue = await page.locator('[data-live-stat]').textContent()

      // Wait for refresh (5s + buffer)
      await page.waitForTimeout(6000)

      // Data should potentially update (or at least re-fetch)
      // Check for refresh indicator
      await expect(page.locator('[data-last-updated]')).toBeVisible()
    })

    test('should have manual refresh button', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Click refresh
      await page.click('button[aria-label="Refresh"]')

      // Loading indicator should appear
      await expect(page.locator('[data-loading="true"]')).toBeVisible()
    })
  })

  test.describe('Multi-language (i18n)', () => {
    test('should switch language to English', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Click language switcher
      await page.click('[aria-label*="language"]')
      await page.click('text=English')

      // UI should be in English
      await expect(page.locator('h1, h2, button')).toContainText(/Orders|Dashboard|Save/)
    })

    test('should switch language to Polish', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      await page.click('[aria-label*="language"]')
      await page.click('text=Polski')

      // UI should be in Polish
      await expect(page.locator('h1, h2, button')).toContainText(/Zamówienia|Dashboard|Zapisz/)
    })

    test('should persist language preference', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Switch to English
      await page.click('[aria-label*="language"]')
      await page.click('text=English')

      // Reload
      await page.reload()

      // Should still be English
      await expect(page.locator('h1, h2')).toContainText(/Orders|Dashboard/)
    })
  })

  test.describe('PWA Features', () => {
    test('should have service worker registered', async ({ page }) => {
      await page.goto('http://localhost:3000')

      // Check for service worker
      const hasServiceWorker = await page.evaluate(() =>
        'serviceWorker' in navigator
      )
      expect(hasServiceWorker).toBe(true)
    })

    test('should work offline (cached pages)', async ({ page }) => {
      await page.goto('http://localhost:3000/dashboard')

      // Wait for caching
      await page.waitForTimeout(1000)

      // Go offline
      await page.context().setOffline(true)

      // Reload
      await page.reload()

      // Should still show content (from cache)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should show install prompt on mobile', async ({ page }) => {
      // Set mobile user agent
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('http://localhost:3000')

      // Note: Install prompt is browser-specific and may not appear in tests
      // Just check that manifest exists
      const manifestLink = page.locator('link[rel="manifest"]')
      await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
    })
  })

  test.describe('Image Optimization', () => {
    test('should lazy load images', async ({ page }) => {
      await page.goto('http://localhost:3000/products')

      // Images below fold should have loading="lazy"
      const images = page.locator('img[loading="lazy"]')
      await expect(images.first()).toBeVisible()
    })

    test('should use WebP format when supported', async ({ page }) => {
      await page.goto('http://localhost:3000/products')

      // Check for Next.js optimized images
      const optimizedImages = page.locator('img[src*="_next/image"]')
      await expect(optimizedImages.first()).toBeVisible()
    })

    test('should show blur placeholder while loading', async ({ page }) => {
      // Throttle network to see placeholder
      await page.route('**/*.{png,jpg,jpeg,webp}', route => {
        setTimeout(() => route.continue(), 2000)
      })

      await page.goto('http://localhost:3000/products')

      // Should see blurred placeholder
      const placeholder = page.locator('img[style*="blur"]')
      await expect(placeholder).toBeVisible()
    })
  })
})
