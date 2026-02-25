/**
 * E2E Tests for CNC Copilot Chat Panel
 *
 * Tests the floating chat UI:
 * - Open/close panel
 * - Keyboard shortcut Ctrl+Shift+K
 * - Message sending
 * - Welcome state
 * - Mobile responsive
 */

import { test, expect } from './fixtures/auth.fixture'
import { VIEWPORTS } from './helpers/test-data'

test.describe('CNC Copilot Chat Panel', () => {
  test('copilot button is visible on dashboard', async ({ authenticatedPage: page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const copilotButton = page.locator('[data-testid="copilot-toggle"]')
    await expect(copilotButton).toBeVisible()
  })

  test('clicking copilot button opens the chat panel', async ({ authenticatedPage: page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await page.click('[data-testid="copilot-toggle"]')

    const chatPanel = page.locator('[data-testid="copilot-panel"]')
    await expect(chatPanel).toBeVisible()
  })

  test('clicking X closes the chat panel', async ({ authenticatedPage: page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Open
    await page.click('[data-testid="copilot-toggle"]')
    await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible()

    // Close
    await page.click('[data-testid="copilot-close"]')
    await expect(page.locator('[data-testid="copilot-panel"]')).not.toBeVisible()
  })

  test('Ctrl+Shift+K toggles the chat panel', async ({ authenticatedPage: page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Open
    await page.keyboard.press('Control+Shift+K')
    await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible()

    // Close
    await page.keyboard.press('Control+Shift+K')
    await expect(page.locator('[data-testid="copilot-panel"]')).not.toBeVisible()
  })

  test('panel shows welcome message when empty', async ({ authenticatedPage: page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await page.click('[data-testid="copilot-toggle"]')

    const welcome = page.locator('[data-testid="copilot-welcome"]')
    await expect(welcome).toBeVisible()
    await expect(welcome).toContainText('CNC Copilot')
  })

  test('user can type a message', async ({ authenticatedPage: page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await page.click('[data-testid="copilot-toggle"]')

    const input = page.locator('[data-testid="copilot-input"]')
    await expect(input).toBeVisible()
    await input.fill('pokaż opóźnione zamówienia')

    expect(await input.inputValue()).toBe('pokaż opóźnione zamówienia')
  })

  test('panel is responsive on mobile viewport', async ({ authenticatedPage: page }) => {
    await page.setViewportSize(VIEWPORTS.mobile)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Copilot button should still be visible
    const copilotButton = page.locator('[data-testid="copilot-toggle"]')
    await expect(copilotButton).toBeVisible()

    // Open panel
    await copilotButton.click()

    const chatPanel = page.locator('[data-testid="copilot-panel"]')
    await expect(chatPanel).toBeVisible()

    // Panel should take full width on mobile
    const box = await chatPanel.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(VIEWPORTS.mobile.width * 0.9)
    }
  })
})
