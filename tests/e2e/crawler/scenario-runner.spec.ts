/**
 * Level 3 — Scenario Runner
 * Reads scenarios from scenarios.yml and executes them sequentially.
 * Each scenario is a series of steps (goto, click, fill, expect, etc.).
 */

import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { CRAWLER_CONFIG } from './crawler.config'
import { createErrorCollector } from './crawler-utils'
import { STORAGE_STATE } from './crawler-auth.spec'

test.use({ storageState: STORAGE_STATE })

// ── Minimal YAML Parser ────────────────────────────
// Parses the subset of YAML used in scenarios.yml.
// Supports: scalars, simple maps, sequences with - prefix, nested maps.

interface ScenarioStep {
  [key: string]: unknown
}

interface Scenario {
  name: string
  steps: ScenarioStep[]
}

interface ScenariosFile {
  scenarios: Scenario[]
}

function parseYaml(text: string): ScenariosFile {
  const lines = text.split('\n')
  const scenarios: Scenario[] = []
  let current: Scenario | null = null
  let currentStep: ScenarioStep | null = null
  let stepSubKey: string | null = null
  let subMap: Record<string, unknown> | null = null

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    // Skip empty lines and comments
    if (/^\s*$/.test(raw) || /^\s*#/.test(raw)) continue

    const indent = raw.search(/\S/)
    const trimmed = raw.trim()

    // Top-level "scenarios:" — skip
    if (trimmed === 'scenarios:') continue

    // New scenario: "- name: ..."
    if (indent <= 4 && trimmed.startsWith('- name:')) {
      // Flush previous sub-map
      if (currentStep && stepSubKey && subMap) {
        currentStep[stepSubKey] = subMap
        subMap = null
        stepSubKey = null
      }
      if (currentStep && current) {
        current.steps.push(currentStep)
        currentStep = null
      }

      const name = trimmed.replace(/^- name:\s*/, '').replace(/^["']|["']$/g, '')
      current = { name, steps: [] }
      scenarios.push(current)
      continue
    }

    // "steps:" marker
    if (trimmed === 'steps:') continue

    // New step: "- key: value" or "- key:"
    if (trimmed.startsWith('- ') && current) {
      // Flush previous step
      if (currentStep && stepSubKey && subMap) {
        currentStep[stepSubKey] = subMap
        subMap = null
        stepSubKey = null
      }
      if (currentStep) {
        current.steps.push(currentStep)
      }

      const stepContent = trimmed.slice(2).trim()
      const colonIdx = stepContent.indexOf(':')
      if (colonIdx === -1) {
        currentStep = null
        continue
      }

      const key = stepContent.slice(0, colonIdx).trim()
      const val = stepContent.slice(colonIdx + 1).trim()

      currentStep = {}
      if (val === '' || val === '|') {
        // Sub-map or sub-keys follow
        stepSubKey = key
        subMap = {}
      } else {
        // Simple key: value
        currentStep[key] = parseValue(val)
      }
      continue
    }

    // Sub-key inside a step (indented under "- key:")
    if (currentStep && stepSubKey && subMap && indent >= 10) {
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx !== -1) {
        const subKey = trimmed.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '')
        const subVal = trimmed.slice(colonIdx + 1).trim()

        if (subVal === '' || subVal === '{') {
          // Nested object (e.g., element_count: { selector: "...", min: 1 })
          // Check if it's an inline object
          continue
        }
        subMap[subKey] = parseValue(subVal)
      }
      continue
    }

    // Handle sub-keys at slightly different indentation
    if (currentStep && stepSubKey && subMap) {
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx !== -1 && !trimmed.startsWith('-')) {
        const subKey = trimmed.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '')
        const subVal = trimmed.slice(colonIdx + 1).trim()
        if (subVal) {
          subMap[subKey] = parseValue(subVal)
        }
        continue
      }
    }
  }

  // Flush last step
  if (currentStep && stepSubKey && subMap) {
    currentStep[stepSubKey] = subMap
  }
  if (currentStep && current) {
    current.steps.push(currentStep)
  }

  return { scenarios }
}

function parseValue(val: string): string | number | Record<string, unknown> {
  // Remove quotes
  const unquoted = val.replace(/^["']|["']$/g, '')

  // Number
  if (/^\d+$/.test(unquoted)) return parseInt(unquoted, 10)

  return unquoted
}

// ── Step Executor ──────────────────────────────────

async function executeStep(page: Page, step: ScenarioStep): Promise<void> {
  const timeout = CRAWLER_CONFIG.timeouts.action

  if ('goto' in step) {
    const target = String(step.goto)
    await page.goto(target, {
      timeout: CRAWLER_CONFIG.timeouts.pageLoad,
      waitUntil: 'domcontentloaded',
    })
    return
  }

  if ('click' in step) {
    const text = String(step.click)
    // Try getByRole(button/link) first, fall back to getByText
    const byRole = page.getByRole('button', { name: text })
      .or(page.getByRole('link', { name: text }))
      .or(page.getByRole('menuitem', { name: text }))
    const roleVisible = await byRole.first().isVisible({ timeout: 2000 }).catch(() => false)

    if (roleVisible) {
      await byRole.first().click({ timeout })
    } else {
      await page.getByText(text, { exact: false }).first().click({ timeout })
    }
    return
  }

  if ('fill' in step) {
    const fields = step.fill as Record<string, string>
    for (const [label, value] of Object.entries(fields)) {
      const input = page.getByLabel(label, { exact: false })
      const isVisible = await input.first().isVisible({ timeout: 3000 }).catch(() => false)
      if (isVisible) {
        await input.first().fill(value, { timeout })
      } else {
        // Fallback: try placeholder
        await page.getByPlaceholder(label, { exact: false }).first().fill(value, { timeout })
      }
    }
    return
  }

  if ('expect' in step) {
    const expectations = step.expect as Record<string, unknown>

    if ('url_contains' in expectations) {
      const fragment = String(expectations.url_contains)
      await expect(page).toHaveURL(new RegExp(escapeRegex(fragment)), { timeout })
    }

    if ('text_visible' in expectations) {
      const text = String(expectations.text_visible)
      await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout })
    }

    if ('element_visible' in expectations) {
      const selector = String(expectations.element_visible)
      await expect(page.locator(selector).first()).toBeVisible({ timeout })
    }

    if ('element_count' in expectations) {
      const opts = expectations.element_count as Record<string, unknown>
      const selector = String(opts.selector || 'div')
      const min = Number(opts.min || 1)
      const count = await page.locator(selector).count()
      expect(count, `Expected at least ${min} "${selector}" elements, found ${count}`).toBeGreaterThanOrEqual(min)
    }
    return
  }

  if ('wait' in step) {
    await page.waitForTimeout(Number(step.wait))
    return
  }

  if ('press' in step) {
    const key = String(step.press)
    await page.keyboard.press(key)
    return
  }

  if ('screenshot' in step) {
    const name = String(step.screenshot)
    await page.screenshot({
      path: `test-results/scenarios/${name}.png`,
      fullPage: false,
    })
    return
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── Load Scenarios ─────────────────────────────────

const scenariosPath = path.resolve(__dirname, '../scenarios.yml')
const scenariosRaw = fs.readFileSync(scenariosPath, 'utf-8')
const { scenarios } = parseYaml(scenariosRaw)

// ── Test Suite ─────────────────────────────────────

const results: { name: string; status: 'PASS' | 'FAIL'; error?: string }[] = []

test.describe('Scenario Runner', () => {
  test.describe.configure({ mode: 'serial' })

  for (const scenario of scenarios) {
    test(`scenario: ${scenario.name}`, async ({ page }) => {
      const collector = createErrorCollector(page, scenario.name)

      try {
        for (const step of scenario.steps) {
          await executeStep(page, step)
        }

        const errors = collector.getErrors().filter((e) => e.severity === 'error')
        if (errors.length > 0) {
          results.push({
            name: scenario.name,
            status: 'FAIL',
            error: errors.map((e) => e.message).join('; '),
          })
          // Don't hard-fail on console errors, just record them
        } else {
          results.push({ name: scenario.name, status: 'PASS' })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({ name: scenario.name, status: 'FAIL', error: message })
        throw err // Re-throw so Playwright marks the test as failed
      }
    })
  }

  test('scenario summary report', async () => {
    console.log('\n' + '='.repeat(60))
    console.log('  SCENARIO RUNNER REPORT')
    console.log('='.repeat(60))

    for (const r of results) {
      const icon = r.status === 'PASS' ? 'PASS' : 'FAIL'
      console.log(`  [${icon}] ${r.name}`)
      if (r.error) {
        console.log(`         ${r.error.slice(0, 120)}`)
      }
    }

    const passed = results.filter((r) => r.status === 'PASS').length
    const failed = results.filter((r) => r.status === 'FAIL').length

    console.log('\n' + '-'.repeat(60))
    console.log(`  TOTAL: ${results.length} | PASS: ${passed} | FAIL: ${failed}`)
    console.log('='.repeat(60) + '\n')

    expect(failed, `${failed} scenario(s) failed — see report above`).toBe(0)
  })
})
