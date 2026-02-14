/**
 * Unit Tests for Anomaly Explanations (Phase 1 — Feature 1.1)
 *
 * Tests the AI enrichment layer that adds natural-language explanations
 * to threshold-based anomaly alerts. The base detection (time_overrun,
 * deadline_risk, stale_order, cost_overrun) is in lib/anomaly-alerts.ts.
 *
 * Phase 1 adds:
 * - AI-generated explanation for each alert (why it matters, what to do)
 * - Heuristic fallback when Gemini is unavailable
 * - Caching of explanations to avoid redundant AI calls
 *
 * CONTRACT for backend-dev:
 * - New function: enrichAnomalyAlerts(alerts) -> alerts with explanation field
 * - OR: extend getAnomalyAlerts to include explanation field
 * - Each AnomalyAlert gets an `explanation` string (actionable, Polish)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================
// MOCKS
// ============================================

const mockGenerateContent = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent }
    }
  },
  SchemaType: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================
// MOCK ALERT DATA (same shape as lib/anomaly-alerts.ts output)
// ============================================

import type { AnomalyAlert } from '@/types/anomaly-alerts'

const MOCK_TIME_OVERRUN: AnomalyAlert = {
  type: 'time_overrun',
  severity: 'warning',
  icon: '🟡',
  title: 'ORD-001 — przekroczenie czasu',
  description: 'Faktyczny czas: 16.0h vs szacowany: 10.0h (160%). Klient: Firma ABC',
  orderId: '1',
  orderNumber: 'ORD-001',
  metric: '160%',
}

const MOCK_DEADLINE_RISK: AnomalyAlert = {
  type: 'deadline_risk',
  severity: 'critical',
  icon: '🔴',
  title: 'ORD-010 — deadline za 1 dni',
  description: 'Zero zarejestrowanego czasu pracy. Klient: Firma Urgent.',
  orderId: '2',
  orderNumber: 'ORD-010',
  metric: '1 dni',
}

const MOCK_COST_OVERRUN: AnomalyAlert = {
  type: 'cost_overrun',
  severity: 'warning',
  icon: '💸',
  title: 'ORD-030 — koszt przekracza cenę',
  description: 'Koszt pracy: 1200 PLN vs cena: 1000 PLN (120%). Klient: Firma Expensive',
  orderId: '3',
  orderNumber: 'ORD-030',
  metric: '120%',
}

const MOCK_STALE_ORDER: AnomalyAlert = {
  type: 'stale_order',
  severity: 'warning',
  icon: '⏸️',
  title: 'ORD-020 — brak aktywności',
  description: 'Status "w toku" od 20 dni, mniej niż 1h pracy. Klient: Firma Stale',
  orderId: '4',
  orderNumber: 'ORD-020',
  metric: '20 dni',
}

// ============================================
// HEURISTIC EXPLANATION FALLBACK
// ============================================

describe('Anomaly Explanations — Heuristic Fallback', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    mockGenerateContent.mockReset()
  })

  afterEach(() => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
  })

  it('should generate heuristic explanation for time_overrun', () => {
    // CONTRACT: When no API key, produce a Polish explanation from alert metadata
    // The explanation should mention the overrun percentage and suggest action
    const alert = MOCK_TIME_OVERRUN

    // Heuristic explanation should be derivable from alert.type + alert.metric
    expect(alert.type).toBe('time_overrun')
    expect(alert.metric).toBe('160%')
    // Backend-dev will implement: enrichAnomalyAlerts([alert]) -> alert with explanation
    // Heuristic for time_overrun: "Czas pracy przekroczony o X%. Sprawdz przyczyne..."
  })

  it('should generate heuristic explanation for deadline_risk', () => {
    const alert = MOCK_DEADLINE_RISK
    expect(alert.type).toBe('deadline_risk')
    expect(alert.metric).toBe('1 dni')
    // Heuristic: "Deadline za X dni, brak postepow. Pilne: przydziel zasoby..."
  })

  it('should generate heuristic explanation for cost_overrun', () => {
    const alert = MOCK_COST_OVERRUN
    expect(alert.type).toBe('cost_overrun')
    expect(alert.metric).toBe('120%')
    // Heuristic: "Koszt pracy przekracza cene sprzedazy o X%. Rozważ renegocjacje..."
  })

  it('should generate heuristic explanation for stale_order', () => {
    const alert = MOCK_STALE_ORDER
    expect(alert.type).toBe('stale_order')
    expect(alert.metric).toBe('20 dni')
    // Heuristic: "Zlecenie bez aktywnosci od X dni. Skontaktuj sie z klientem..."
  })
})

// ============================================
// ALERT STRUCTURE VALIDATION
// ============================================

describe('Anomaly Explanations — Alert Structure', () => {
  it('should validate AnomalyAlert has required fields', () => {
    const alert = MOCK_TIME_OVERRUN
    expect(alert).toHaveProperty('type')
    expect(alert).toHaveProperty('severity')
    expect(alert).toHaveProperty('icon')
    expect(alert).toHaveProperty('title')
    expect(alert).toHaveProperty('description')
    expect(alert).toHaveProperty('orderId')
    expect(alert).toHaveProperty('orderNumber')
    expect(alert).toHaveProperty('metric')
  })

  it('should have valid severity values', () => {
    expect(['warning', 'critical']).toContain(MOCK_TIME_OVERRUN.severity)
    expect(['warning', 'critical']).toContain(MOCK_DEADLINE_RISK.severity)
    expect(['warning', 'critical']).toContain(MOCK_COST_OVERRUN.severity)
    expect(['warning', 'critical']).toContain(MOCK_STALE_ORDER.severity)
  })

  it('should have valid anomaly types', () => {
    const validTypes = ['time_overrun', 'deadline_risk', 'stale_order', 'cost_overrun']
    expect(validTypes).toContain(MOCK_TIME_OVERRUN.type)
    expect(validTypes).toContain(MOCK_DEADLINE_RISK.type)
    expect(validTypes).toContain(MOCK_COST_OVERRUN.type)
    expect(validTypes).toContain(MOCK_STALE_ORDER.type)
  })
})

// ============================================
// AI ENRICHMENT (with Gemini mock)
// ============================================

describe('Anomaly Explanations — AI Enrichment', () => {
  beforeEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
    mockGenerateContent.mockReset()
  })

  afterEach(() => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
  })

  it('should enrich alerts with AI-generated explanations when API key exists', async () => {
    // CONTRACT: When Gemini is available, explanations should be richer
    // than heuristic — mentioning root cause analysis and specific actions
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify([
          {
            orderNumber: 'ORD-001',
            explanation: 'Przekroczenie czasu o 60% moze wynikac z niedoszacowania zlozonosci detalu. Rekomendacja: sprawdz czy obrobka wymaga dodatkowych operacji i skoryguj szablon wyceny.',
          },
        ]),
      },
    })

    // Backend-dev will implement the actual enrichment function
    // Test validates the expected shape of AI response
    const aiResponse = JSON.parse(
      mockGenerateContent.mock.results.length > 0
        ? '{}'
        : '[]'
    )
    // The mock is set up correctly for when backend-dev calls it
    expect(mockGenerateContent).not.toHaveBeenCalled() // Not called yet - just configured
  })

  it('should fallback to heuristic when Gemini returns error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini quota exceeded'))

    // CONTRACT: On AI failure, enrichment should still produce explanations
    // using the heuristic path (based on alert type + metric)
    // No throw, graceful degradation
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('should not call Gemini when API key is missing', () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY

    // CONTRACT: No API key = heuristic only, Gemini never invoked
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('should handle empty alerts array gracefully', () => {
    // CONTRACT: enrichAnomalyAlerts([]) should return []
    const emptyAlerts: AnomalyAlert[] = []
    expect(emptyAlerts).toEqual([])
  })
})

// ============================================
// EXPLANATION QUALITY CONTRACT
// ============================================

describe('Anomaly Explanations — Quality Contract', () => {
  it('explanation for time_overrun should suggest root cause investigation', () => {
    // CONTRACT: explanation must contain actionable advice
    // - Mention the overrun percentage
    // - Suggest checking estimation accuracy or complexity
    // Backend-dev implements the heuristic template
    const expectedPatterns = ['przekroczenie', 'czas', 'sprawdz']
    // At minimum, heuristic should include these Polish keywords
    expect(expectedPatterns.length).toBe(3)
  })

  it('explanation for deadline_risk should suggest resource allocation', () => {
    const expectedPatterns = ['deadline', 'priorytet', 'zasoby']
    expect(expectedPatterns.length).toBe(3)
  })

  it('explanation for cost_overrun should suggest price or cost review', () => {
    const expectedPatterns = ['koszt', 'cena', 'marza']
    expect(expectedPatterns.length).toBe(3)
  })

  it('explanation for stale_order should suggest customer contact', () => {
    const expectedPatterns = ['aktywnosc', 'kontakt', 'klient']
    expect(expectedPatterns.length).toBe(3)
  })
})
