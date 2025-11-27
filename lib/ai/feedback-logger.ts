/**
 * AI Feedback Logger - Frontend Helper
 *
 * Captures user corrections to AI suggestions.
 * Fire & Forget - UI doesn't wait for this.
 * Silent failures - errors logged to console only.
 *
 * This builds our unique training dataset (Golden Dataset / CNC MOAT)
 */

export type FeedbackFeature =
  | 'cnc_time_estimation' // Time estimation for CNC operations
  | 'material_selection' // Material recommendations
  | 'price_calculation' // Price/cost calculations
  | 'quantity_suggestion' // Quantity suggestions
  | 'deadline_estimation' // Deadline predictions
  | 'operation_sequence' // Operation order suggestions
  | 'tool_selection' // Tool recommendations
  | 'custom' // For other features

export interface FeedbackContext {
  material?: string
  thickness?: number
  dimensions?: string
  quantity?: number
  machine?: string
  operation?: string
  [key: string]: unknown // Allow custom context fields
}

export interface FeedbackOptions {
  /** Feature identifier */
  feature: FeedbackFeature | string
  /** Context/input that AI used for suggestion */
  context?: FeedbackContext
  /** AI's suggested value */
  aiValue: string | number
  /** User's final value (correction) */
  userValue: string | number
  /** Optional reason for correction */
  reason?: string
  /** Optional session ID for tracking */
  sessionId?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Log AI correction to backend
 *
 * @example
 * // In a component:
 * <Input
 *   defaultValue={aiSuggestion}
 *   onBlur={(e) => {
 *     logAiCorrection({
 *       feature: 'cnc_time_estimation',
 *       aiValue: aiSuggestion,
 *       userValue: e.target.value,
 *       context: { material: 'stal_304', thickness: 10 }
 *     });
 *   }}
 * />
 */
export function logAiCorrection(options: FeedbackOptions): void {
  const { feature, context, aiValue, userValue, reason, sessionId, metadata } = options

  // Client-side validation - don't send request if no change
  if (String(aiValue) === String(userValue)) {
    return
  }

  // Don't log empty corrections
  if (!userValue && userValue !== 0) {
    return
  }

  // Fire & Forget - no await, UI doesn't wait
  fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature_name: feature,
      input_context: context,
      ai_output: aiValue,
      user_correction: userValue,
      correction_reason: reason,
      session_id: sessionId,
      metadata,
    }),
  }).catch((err) => {
    // Silent fail - log to console only
    console.debug('[FeedbackLogger] Failed to log correction:', err)
  })
}

/**
 * Create a reusable logger for a specific feature
 *
 * @example
 * // Create logger once
 * const timeLogger = createFeatureLogger('cnc_time_estimation');
 *
 * // Use multiple times
 * timeLogger.log(aiSuggestion, userValue, { material: 'stal_304' });
 */
export function createFeatureLogger(feature: FeedbackFeature | string) {
  return {
    /**
     * Log a correction for this feature
     */
    log(aiValue: string | number, userValue: string | number, context?: FeedbackContext, reason?: string) {
      logAiCorrection({
        feature,
        aiValue,
        userValue,
        context,
        reason,
      })
    },

    /**
     * Create an onBlur handler for input fields
     * Use directly on input elements
     *
     * @example
     * <Input
     *   defaultValue={aiSuggestion}
     *   onBlur={timeLogger.createBlurHandler(aiSuggestion, { material: 'stal' })}
     * />
     */
    createBlurHandler(aiValue: string | number, context?: FeedbackContext) {
      return (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const userValue = e.target.value
        logAiCorrection({
          feature,
          aiValue,
          userValue,
          context,
        })
      }
    },

    /**
     * Create an onChange handler that logs on value change
     * Useful for selects/dropdowns
     *
     * @example
     * <Select onChange={materialLogger.createChangeHandler(aiSuggestion, { operation: 'frezowanie' })}>
     */
    createChangeHandler(aiValue: string | number, context?: FeedbackContext) {
      return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const userValue = e.target.value
        logAiCorrection({
          feature,
          aiValue,
          userValue,
          context,
        })
      }
    },
  }
}

/**
 * Pre-configured loggers for common CNC features
 */
export const feedbackLoggers = {
  time: createFeatureLogger('cnc_time_estimation'),
  material: createFeatureLogger('material_selection'),
  price: createFeatureLogger('price_calculation'),
  quantity: createFeatureLogger('quantity_suggestion'),
  deadline: createFeatureLogger('deadline_estimation'),
  operation: createFeatureLogger('operation_sequence'),
  tool: createFeatureLogger('tool_selection'),
}

// Default export for convenience
export default logAiCorrection
