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

    // Sprawdź główne sekcje
    await expect(page.locator('text=Szybki start')).toBeVisible()
    await expect(page.locator('text=Poradnik Użytkownika')).toBeVisible()
    await expect(page.locator('text=Dokumentacja Techniczna')).toBeVisible()
  })

  test('sidebar navigation jest widoczna', async ({ page }) => {
    await page.goto('/docs')

    // Sprawdź elementy sidebar
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.getByText('Pierwsze kroki')).toBeVisible()
    await expect(page.getByText('FAQ')).toBeVisible()
    await expect(page.getByText('Video Tutoriale')).toBeVisible()
  })

  test('nawigacja do User Guide działa', async ({ page }) => {
    await page.goto('/docs')

    // Kliknij link "Pierwsze kroki"
    await page.click('text=Pierwsze kroki')

    // Sprawdź URL i zawartość
    await expect(page).toHaveURL('/docs/user-guide/getting-started')
    await expect(page.locator('h1')).toContainText('Pierwsze kroki')

    // Sprawdź czy jest podstawowa treść
    await expect(page.locator('text=Rejestracja i pierwsze logowanie')).toBeVisible()
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
      await expect(page.locator('h1')).toContainText(section.title)
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

    // Sprawdź kilka sekcji FAQ
    await expect(page.locator('text=Konto i logowanie')).toBeVisible()
    await expect(page.locator('text=Zamówienia')).toBeVisible()
    await expect(page.locator('text=Magazyn')).toBeVisible()
  })

  test('Video Tutorials page się ładuje', async ({ page }) => {
    await page.goto('/docs/video-tutorials')

    await expect(page.locator('h1')).toContainText('Video Tutoriale')
    await expect(page.locator('text=Pierwsze kroki')).toBeVisible()
  })

  test('Flowcharts page się ładuje', async ({ page }) => {
    await page.goto('/docs/flowcharts')

    await expect(page.locator('h1')).toContainText('Diagramy procesów')
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

  test('markdown rendering - tabele', async ({ page }) => {
    await page.goto('/docs/user-guide/getting-started')

    // Sprawdź czy tabele są renderowane
    const table = page.locator('table')
    await expect(table.first()).toBeVisible()
  })

  test('internal links między docs działają', async ({ page }) => {
    await page.goto('/docs')

    // Kliknij link do User Guide
    await page.click('text=/docs/user-guide/getting-started')
    await expect(page).toHaveURL('/docs/user-guide/getting-started')

    // Sprawdź link do FAQ w tekście
    const faqLink = page.locator('a[href="/docs/faq"]').first()
    if (await faqLink.isVisible()) {
      await faqLink.click()
      await expect(page).toHaveURL('/docs/faq')
    }
  })
})
