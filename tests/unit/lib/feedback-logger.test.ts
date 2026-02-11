/**
 * Unit Tests for AI Feedback Logger
 *
 * Tests the fire-and-forget feedback logging mechanism
 * that captures user corrections to AI suggestions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
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

import { logAiCorrection, createFeatureLogger, feedbackLoggers } from '@/lib/ai/feedback-logger'

describe('Feedback Logger — logAiCorrection', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should send POST request with correction data', () => {
    logAiCorrection({
      feature: 'cnc_time_estimation',
      aiValue: 2.5,
      userValue: 3.0,
      context: { material: 'stal_304', thickness: 10 },
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/feedback',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    // Parse the body
    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.feature_name).toBe('cnc_time_estimation')
    expect(body.ai_output).toBe(2.5)
    expect(body.user_correction).toBe(3.0)
    expect(body.input_context.material).toBe('stal_304')
  })

  it('should NOT send request when aiValue equals userValue', () => {
    logAiCorrection({
      feature: 'price_calculation',
      aiValue: 100,
      userValue: 100,
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should NOT send request when userValue is empty', () => {
    logAiCorrection({
      feature: 'material_selection',
      aiValue: 'stal',
      userValue: '',
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should send request when userValue is 0 (zero is valid)', () => {
    logAiCorrection({
      feature: 'quantity_suggestion',
      aiValue: 5,
      userValue: 0,
    })

    expect(mockFetch).toHaveBeenCalled()
  })

  it('should handle string comparison for aiValue and userValue', () => {
    logAiCorrection({
      feature: 'material_selection',
      aiValue: '100',
      userValue: 100, // Number 100 vs String '100' — same as string
    })

    // String(100) === String('100'), so should NOT send
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should silently handle fetch errors', () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    // Should not throw
    expect(() => {
      logAiCorrection({
        feature: 'cnc_time_estimation',
        aiValue: 1,
        userValue: 2,
      })
    }).not.toThrow()
  })
})

describe('Feedback Logger — createFeatureLogger', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should create logger with correct feature name', () => {
    const logger = createFeatureLogger('tool_selection')

    logger.log('drill_5mm', 'drill_8mm', { material: 'aluminium' })

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('tool_selection')
  })

  it('should create blur handler that logs on blur', () => {
    const logger = createFeatureLogger('cnc_time_estimation')

    const handler = logger.createBlurHandler(2.5, { material: 'stal' })
    expect(typeof handler).toBe('function')

    // Simulate blur event
    const mockEvent = {
      target: { value: '3.0' },
    } as unknown as React.FocusEvent<HTMLInputElement>

    handler(mockEvent)

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.ai_output).toBe(2.5)
    expect(body.user_correction).toBe('3.0')
  })

  it('should create change handler that logs on change', () => {
    const logger = createFeatureLogger('material_selection')

    const handler = logger.createChangeHandler('stal_304', { operation: 'frezowanie' })
    expect(typeof handler).toBe('function')

    const mockEvent = {
      target: { value: 'aluminium_6061' },
    } as unknown as React.ChangeEvent<HTMLSelectElement>

    handler(mockEvent)

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.ai_output).toBe('stal_304')
    expect(body.user_correction).toBe('aluminium_6061')
  })
})

describe('Feedback Logger — Pre-configured Loggers', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should have all pre-configured loggers', () => {
    expect(feedbackLoggers.time).toBeDefined()
    expect(feedbackLoggers.material).toBeDefined()
    expect(feedbackLoggers.price).toBeDefined()
    expect(feedbackLoggers.quantity).toBeDefined()
    expect(feedbackLoggers.deadline).toBeDefined()
    expect(feedbackLoggers.operation).toBeDefined()
    expect(feedbackLoggers.tool).toBeDefined()
  })

  it('should log with correct feature name for time logger', () => {
    feedbackLoggers.time.log(2, 3)

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('cnc_time_estimation')
  })

  it('should log with correct feature name for price logger', () => {
    feedbackLoggers.price.log(500, 600)

    expect(mockFetch).toHaveBeenCalled()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.feature_name).toBe('price_calculation')
  })
})
