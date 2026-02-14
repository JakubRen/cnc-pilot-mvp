/**
 * Unit Tests for Feedback Logger Wiring (Phase 1 — Feature 1.3)
 *
 * Tests that logAiCorrection() is properly called when users correct
 * AI suggestions in forms. This validates the integration between
 * UI components and the feedback-logger.ts API.
 *
 * These tests complement the existing feedback-logger.test.ts (which tests
 * the logger API itself). These tests focus on the WIRING — ensuring
 * the correct feature names, values, and contexts are passed through.
 *
 * CONTRACT for frontend-dev:
 * - Each AI suggestion field must call logAiCorrection on user correction
 * - Feature names must match FeedbackFeature type exactly
 * - Context must include relevant order/material metadata
 * - Fire-and-forget: UI must not wait for feedback logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// MOCKS
// ============================================

const mockFetch = vi.fn().mockResolvedValue({ ok: true })
vi.stubGlobal('fetch', mockFetch)

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  logAiCorrection,
  createFeatureLogger,
  feedbackLoggers,
  type FeedbackFeature,
  type FeedbackOptions,
} from '@/lib/ai/feedback-logger'

// ============================================
// FEATURE NAME REGISTRY
// ============================================

describe('Feedback Wiring — Feature Name Registry', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should have all CNC feature loggers pre-configured', () => {
    const expectedFeatures = [
      'time',
      'material',
      'price',
      'quantity',
      'deadline',
      'operation',
      'tool',
    ]

    for (const feature of expectedFeatures) {
      expect(feedbackLoggers).toHaveProperty(feature)
      expect(feedbackLoggers[feature as keyof typeof feedbackLoggers]).toHaveProperty('log')
      expect(feedbackLoggers[feature as keyof typeof feedbackLoggers]).toHaveProperty('createBlurHandler')
      expect(feedbackLoggers[feature as keyof typeof feedbackLoggers]).toHaveProperty('createChangeHandler')
    }
  })

  it('should map feedbackLoggers.time to "cnc_time_estimation" feature', () => {
    feedbackLoggers.time.log(2.5, 3.0, { material: 'stal_304' })

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('cnc_time_estimation')
  })

  it('should map feedbackLoggers.material to "material_selection" feature', () => {
    feedbackLoggers.material.log('stal_304', 'aluminium_6061')

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('material_selection')
  })

  it('should map feedbackLoggers.price to "price_calculation" feature', () => {
    feedbackLoggers.price.log(500, 650)

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('price_calculation')
  })

  it('should map feedbackLoggers.quantity to "quantity_suggestion" feature', () => {
    feedbackLoggers.quantity.log(10, 15)

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('quantity_suggestion')
  })

  it('should map feedbackLoggers.deadline to "deadline_estimation" feature', () => {
    feedbackLoggers.deadline.log('2026-03-01', '2026-03-15')

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('deadline_estimation')
  })

  it('should map feedbackLoggers.operation to "operation_sequence" feature', () => {
    feedbackLoggers.operation.log('frezowanie,toczenie', 'toczenie,frezowanie')

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('operation_sequence')
  })

  it('should map feedbackLoggers.tool to "tool_selection" feature', () => {
    feedbackLoggers.tool.log('frez_5mm', 'frez_8mm')

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('tool_selection')
  })
})

// ============================================
// CONTEXT PASSING
// ============================================

describe('Feedback Wiring — Context Passing', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should pass material context for time estimation corrections', () => {
    logAiCorrection({
      feature: 'cnc_time_estimation',
      aiValue: 2.5,
      userValue: 4.0,
      context: {
        material: 'stal_304',
        thickness: 10,
        operation: 'frezowanie',
      },
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.input_context.material).toBe('stal_304')
    expect(body.input_context.thickness).toBe(10)
    expect(body.input_context.operation).toBe('frezowanie')
  })

  it('should pass dimensions context for price corrections', () => {
    logAiCorrection({
      feature: 'price_calculation',
      aiValue: 500,
      userValue: 750,
      context: {
        material: 'aluminium_6061',
        dimensions: '100x50x20mm',
        quantity: 10,
      },
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.input_context.dimensions).toBe('100x50x20mm')
    expect(body.input_context.quantity).toBe(10)
  })

  it('should pass machine context for tool selection corrections', () => {
    logAiCorrection({
      feature: 'tool_selection',
      aiValue: 'frez_palcowy_10mm',
      userValue: 'frez_kulisty_6mm',
      context: {
        machine: 'DMG_MORI_CMX50U',
        operation: 'frezowanie_3D',
        material: 'stal_nierdzewna',
      },
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.input_context.machine).toBe('DMG_MORI_CMX50U')
    expect(body.input_context.operation).toBe('frezowanie_3D')
  })

  it('should handle missing context gracefully', () => {
    logAiCorrection({
      feature: 'price_calculation',
      aiValue: 100,
      userValue: 200,
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.input_context).toBeUndefined()
  })
})

// ============================================
// CORRECTION PAYLOAD VALIDATION
// ============================================

describe('Feedback Wiring — Payload Validation', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should include ai_output and user_correction in payload', () => {
    logAiCorrection({
      feature: 'cnc_time_estimation',
      aiValue: 2.5,
      userValue: 3.0,
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.ai_output).toBe(2.5)
    expect(body.user_correction).toBe(3.0)
  })

  it('should include correction_reason when provided', () => {
    logAiCorrection({
      feature: 'price_calculation',
      aiValue: 500,
      userValue: 800,
      reason: 'Material jest droższy niż standardowy',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.correction_reason).toBe('Material jest droższy niż standardowy')
  })

  it('should send to /api/feedback endpoint', () => {
    logAiCorrection({
      feature: 'quantity_suggestion',
      aiValue: 5,
      userValue: 10,
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/feedback',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })
})

// ============================================
// SUPPRESSION RULES (no-op scenarios)
// ============================================

describe('Feedback Wiring — Suppression Rules', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should NOT log when AI value equals user value (no change)', () => {
    logAiCorrection({
      feature: 'cnc_time_estimation',
      aiValue: 2.5,
      userValue: 2.5,
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should NOT log when user value is empty string', () => {
    logAiCorrection({
      feature: 'material_selection',
      aiValue: 'stal',
      userValue: '',
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should log when user value is 0 (zero is a valid correction)', () => {
    logAiCorrection({
      feature: 'quantity_suggestion',
      aiValue: 5,
      userValue: 0,
    })

    expect(mockFetch).toHaveBeenCalled()
  })

  it('should NOT log when string representations match (type coercion)', () => {
    logAiCorrection({
      feature: 'price_calculation',
      aiValue: '100',
      userValue: 100,
    })

    // String(100) === String('100') — same value, no correction
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ============================================
// BLUR/CHANGE HANDLER INTEGRATION
// ============================================

describe('Feedback Wiring — Handler Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should create blur handler that captures input value on blur', () => {
    const handler = feedbackLoggers.time.createBlurHandler(2.5, { material: 'stal' })
    expect(typeof handler).toBe('function')

    const mockEvent = {
      target: { value: '3.5' },
    } as unknown as React.FocusEvent<HTMLInputElement>

    handler(mockEvent)

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.ai_output).toBe(2.5)
    expect(body.user_correction).toBe('3.5')
    expect(body.input_context.material).toBe('stal')
  })

  it('should create change handler that captures select value on change', () => {
    const handler = feedbackLoggers.material.createChangeHandler('stal_304', {
      operation: 'toczenie',
    })
    expect(typeof handler).toBe('function')

    const mockEvent = {
      target: { value: 'aluminium_6061' },
    } as unknown as React.ChangeEvent<HTMLSelectElement>

    handler(mockEvent)

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.ai_output).toBe('stal_304')
    expect(body.user_correction).toBe('aluminium_6061')
    expect(body.input_context.operation).toBe('toczenie')
  })

  it('should suppress blur handler when value unchanged', () => {
    const handler = feedbackLoggers.time.createBlurHandler(2.5)

    const mockEvent = {
      target: { value: '2.5' },
    } as unknown as React.FocusEvent<HTMLInputElement>

    handler(mockEvent)

    // String('2.5') !== String(2.5) — these are different, so it WILL fire
    // logAiCorrection compares String(aiValue) === String(userValue)
    // String(2.5) = '2.5', String('2.5') = '2.5' — they match!
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ============================================
// FIRE-AND-FORGET RESILIENCE
// ============================================

describe('Feedback Wiring — Resilience', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should not throw on network error', () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    expect(() => {
      logAiCorrection({
        feature: 'cnc_time_estimation',
        aiValue: 1,
        userValue: 2,
      })
    }).not.toThrow()
  })

  it('should not throw on server error (500)', () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    expect(() => {
      logAiCorrection({
        feature: 'price_calculation',
        aiValue: 100,
        userValue: 200,
      })
    }).not.toThrow()
  })

  it('should support custom feature names', () => {
    const customLogger = createFeatureLogger('custom_clv_adjustment')
    customLogger.log(50000, 65000, { customerName: 'MetalTech' })

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('custom_clv_adjustment')
  })
})
