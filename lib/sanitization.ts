// ============================================
// lib/sanitization.ts
// Input sanitization utilities to prevent XSS and injection attacks
// ============================================

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows only safe HTML tags and attributes
 * @param dirty - Untrusted HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
  })
}

/**
 * Sanitize plain text (strip HTML, trim, normalize whitespace)
 * @param input - Untrusted text string
 * @returns Sanitized plain text
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
}

/**
 * Sanitize and validate email address
 * @param email - Untrusted email string
 * @returns Sanitized email in lowercase
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Escape SQL LIKE pattern special characters
 * Prevents SQL injection in LIKE queries
 * @param input - Untrusted search string
 * @returns Escaped search string
 */
export function escapeSqlLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&')
}

/**
 * Sanitize numeric input
 * @param input - Untrusted numeric string
 * @returns Parsed number or null if invalid
 */
export function sanitizeNumber(input: string | number): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input
  return isNaN(num) || !isFinite(num) ? null : num
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 * @param url - Untrusted URL string
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase()

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return ''
  }

  return url.trim()
}
