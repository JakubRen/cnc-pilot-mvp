/**
 * AI Prompt Injection Sanitizer
 *
 * Sanitizes user input before embedding in AI prompts to prevent:
 * - Prompt injection attacks (jailbreak attempts)
 * - XSS via stored AI responses
 * - Excessive input that inflates token costs
 */

// ============================================
// FIELD LENGTH LIMITS
// ============================================

export const FIELD_LIMITS = {
  /** General short text (part names, materials) */
  SHORT: 255,
  /** Medium text (notes, descriptions) */
  MEDIUM: 500,
  /** Long text (email body, quote text) */
  LONG: 10_000,
  /** Dimensions string */
  DIMENSIONS: 100,
} as const

// ============================================
// PROMPT INJECTION PATTERNS
// ============================================

/**
 * Patterns that indicate prompt injection attempts.
 * These are heuristics — not exhaustive but catch common attacks.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction override
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|rules|prompts)/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  /forget\s+(all\s+)?(previous|above|prior)/i,

  // System prompt extraction
  /(?:reveal|show|print|output|repeat)\s+(?:your|the)\s+(?:system|initial)\s+(?:prompt|instructions|message)/i,
  /what\s+(?:are|is)\s+your\s+(?:system|initial)\s+(?:prompt|instructions)/i,

  // Role switching
  /you\s+are\s+now\s+(?:a|an|the)\s+(?!CNC|cnc)/i,
  /act\s+as\s+(?:a|an|the)\s+(?!CNC|cnc)/i,
  /pretend\s+(?:to\s+be|you\s+are)/i,

  // Delimiter injection
  /---\s*(?:END|STOP|SYSTEM|NEW)\s*---/i,
  /```\s*(?:system|assistant|user)\s*/i,
]

// ============================================
// HTML / XSS PATTERNS
// ============================================

const HTML_TAG_REGEX = /<\/?[a-z][a-z0-9]*[^>]*>/gi
const SCRIPT_REGEX = /<script[\s>][\s\S]*?<\/script>/gi
const EVENT_HANDLER_REGEX = /\bon\w+\s*=\s*["'][^"']*["']/gi

// ============================================
// PUBLIC API
// ============================================

export interface SanitizeOptions {
  /** Maximum string length (default: FIELD_LIMITS.LONG) */
  maxLength?: number
  /** Whether to check for prompt injection patterns (default: true) */
  checkInjection?: boolean
  /** Whether to strip HTML tags (default: true) */
  stripHtml?: boolean
}

export interface SanitizeResult {
  /** Sanitized text */
  text: string
  /** Whether any injection patterns were detected */
  injectionDetected: boolean
  /** Whether the text was truncated */
  wasTruncated: boolean
  /** Original length before truncation */
  originalLength: number
}

/**
 * Sanitize user input before embedding in AI prompts.
 *
 * @param input - Raw user input
 * @param options - Sanitization options
 * @returns Sanitized result with metadata
 */
export function sanitizeUserInput(
  input: string,
  options: SanitizeOptions = {}
): SanitizeResult {
  const {
    maxLength = FIELD_LIMITS.LONG,
    checkInjection = true,
    stripHtml = true,
  } = options

  const originalLength = input.length
  let text = input

  // 1. Strip HTML/XSS
  if (stripHtml) {
    text = text.replace(SCRIPT_REGEX, '')
    text = text.replace(EVENT_HANDLER_REGEX, '')
    text = text.replace(HTML_TAG_REGEX, '')
  }

  // 2. Normalize whitespace (collapse multiple spaces/newlines)
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')

  // 3. Truncate
  const wasTruncated = text.length > maxLength
  if (wasTruncated) {
    text = text.slice(0, maxLength)
  }

  // 4. Check for injection patterns
  let injectionDetected = false
  if (checkInjection) {
    injectionDetected = INJECTION_PATTERNS.some((pattern) => pattern.test(text))
  }

  return {
    text: text.trim(),
    injectionDetected,
    wasTruncated,
    originalLength,
  }
}

/**
 * Sanitize a short field (part name, material, etc.)
 * Convenience wrapper with SHORT limit and no injection check.
 */
export function sanitizeField(input: string | null | undefined, maxLength: number = FIELD_LIMITS.SHORT): string {
  if (!input) return ''
  return sanitizeUserInput(String(input), {
    maxLength,
    checkInjection: false,
    stripHtml: true,
  }).text
}
