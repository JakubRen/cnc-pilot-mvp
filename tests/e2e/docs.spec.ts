import { test, expect } from '@playwright/test'

/**
 * E2E Smoke Tests dla Portalu Wiedzy
 * Sprawdza podstawową funkcjonalność dokumentacji
 */

test.describe('Portal Wiedzy - Smoke Tests', () => {

  test('homepage docs się ładuje', async ({ page }) => {
    await page.goto('/docs')

    // Sprawdź czy h1 jest widoczny
    await expect(page.locator('h1')).toContainText('Portal Wiedzy CNC-Pilot')

    // Sprawdź główne sekcje (heading, nie sidebar)
    await expect(page.locator('h2:has-text("Szybki start")')).toBeVisible()
    await expect(page.locator('h3:has-text("Poradnik Użytkownika")')).toBeVisible()
    await expect(page.locator('h3:has-text("Dokumentacja Techniczna")')).toBeVisible()
  })

  test('sidebar navigation jest widoczna', async ({ page }) => {
    await page.goto('/docs')

    // Sprawdź elementy sidebar (w nav, nie w content)
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('nav a:has-text("Pierwsze kroki")')).toBeVisible()
    await expect(page.locator('nav a:has-text("FAQ")')).toBeVisible()
    await expect(page.locator('nav a:has-text("Video Tutoriale")')).toBeVisible()
  })

  test('User Guide page się ładuje', async ({ page }) => {
    await page.goto('/docs/user-guide/getting-started')

    // Sprawdź zawartość
    await expect(page.locator('h1').first()).toContainText('Pierwsze kroki')

    // Sprawdź czy jest podstawowa treść
    await expect(page.locator('text=Rejestracja i pierwsze logowanie')).toBeVisible()

    // Sprawdź czy sidebar highlightuje aktywny link
    const activeLink = page.locator('nav a:has-text("Pierwsze kroki")')
    await expect(activeLink).toHaveClass(/bg-blue-600/)
  })

  test('wszystkie główne sekcje są dostępne', async ({ page }) => {
    const sections = [
      { url: '/docs/user-guide/orders', title: 'Zarządzanie zamówieniami' },
      { url: '/docs/user-guide/inventory', title: 'Zarządzanie magazynem' },
      { url: '/docs/user-guide/time-tracking', title: 'Śledzenie czasu pracy' },
      { url: '/docs/user-guide/users', title: 'Zarządzanie użytkownikami' },
      { url: '/docs/user-guide/reports', title: 'Raporty i analityka' },
    ]

    for (const section of sections) {
      await page.goto(section.url)
      await expect(page.locator('h1').first()).toContainText(section.title)
    }
  })

  test('Technical Docs są dostępne', async ({ page }) => {
    const techDocs = [
      { url: '/docs/technical/database-schema', keyword: 'Schemat bazy danych' },
      { url: '/docs/technical/api-reference', keyword: 'API Reference' },
      { url: '/docs/technical/authentication', keyword: 'uwierzytelniania' },
      { url: '/docs/technical/multi-tenancy', keyword: 'Multi-Tenancy' },
    ]

    for (const doc of techDocs) {
      await page.goto(doc.url)
      await expect(page.locator('h1')).toContainText(doc.keyword)
    }
  })

  test('FAQ page się ładuje', async ({ page }) => {
    await page.goto('/docs/faq')

    await expect(page.locator('h1')).toContainText('FAQ')

    // Sprawdź kilka sekcji FAQ (headings)
    await expect(page.locator('h2:has-text("Konto i logowanie")')).toBeVisible()
    await expect(page.locator('h2:has-text("Zamówienia")')).toBeVisible()
    await expect(page.locator('h2:has-text("Magazyn")')).toBeVisible()
  })

  test('Video Tutorials page się ładuje', async ({ page }) => {
    await page.goto('/docs/video-tutorials')

    await expect(page.locator('h1')).toContainText('Video Tutoriale')
    await expect(page.locator('h2:has-text("Pierwsze kroki")')).toBeVisible()
  })

  test('Flowcharts page się ładuje', async ({ page }) => {
    await page.goto('/docs/flowcharts')

    await expect(page.locator('h1').first()).toContainText('Diagramy procesów')
    await expect(page.locator('text=Proces rejestracji')).toBeVisible()
  })

  test('link powrotu do głównej aplikacji działa', async ({ page }) => {
    await page.goto('/docs')

    // Znajdź link "← CNC-Pilot"
    const backLink = page.locator('a:has-text("← CNC-Pilot")')
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', '/')
  })

  test('aktywna strona jest podświetlona w sidebar', async ({ page }) => {
    await page.goto('/docs/faq')

    // Link FAQ powinien mieć klasę aktywną (bg-blue-600)
    const faqLink = page.locator('a:has-text("FAQ")')
    await expect(faqLink).toHaveClass(/bg-blue-600/)
  })

  test('responsive - sidebar widoczna na desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/docs')

    const sidebar = page.locator('nav')
    await expect(sidebar).toBeVisible()
  })

  test('markdown rendering - code blocks', async ({ page }) => {
    await page.goto('/docs/technical/api-reference')

    // Sprawdź czy code blocks są renderowane
    const codeBlock = page.locator('pre')
    await expect(codeBlock.first()).toBeVisible()
  })

  test('markdown rendering - links i formatowanie', async ({ page }) => {
    await page.goto('/docs/faq')

    // Sprawdź czy linki są renderowane
    const link = page.locator('main a').first()
    await expect(link).toBeVisible()

    // Sprawdź czy headings są renderowane
    await expect(page.locator('h2').first()).toBeVisible()
  })

  test('wszystkie linki sidebar są obecne', async ({ page }) => {
    await page.goto('/docs')

    // Sprawdź czy wszystkie główne linki są widoczne i mają poprawne href
    await expect(page.locator('nav a:has-text("Pierwsze kroki")')).toHaveAttribute('href', '/docs/user-guide/getting-started')
    await expect(page.locator('nav a:has-text("FAQ")')).toHaveAttribute('href', '/docs/faq')
    await expect(page.locator('nav a:has-text("Video Tutoriale")')).toHaveAttribute('href', '/docs/video-tutorials')
    await expect(page.locator('nav a:has-text("Diagramy Procesów")')).toHaveAttribute('href', '/docs/flowcharts')
  })
})
