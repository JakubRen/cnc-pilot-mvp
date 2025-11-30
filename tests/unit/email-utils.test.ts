import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase before importing email-utils
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}))

import { extractEmailDomain, isPublicEmailDomain } from '@/lib/email-utils'

describe('extractEmailDomain', () => {
  it('should extract domain from valid email', () => {
    expect(extractEmailDomain('jan.kowalski@firma.pl')).toBe('firma.pl')
    expect(extractEmailDomain('user@example.com')).toBe('example.com')
    expect(extractEmailDomain('test@subdomain.domain.org')).toBe('subdomain.domain.org')
  })

  it('should return lowercase domain', () => {
    expect(extractEmailDomain('user@FIRMA.PL')).toBe('firma.pl')
    expect(extractEmailDomain('user@FiRmA.Pl')).toBe('firma.pl')
  })

  it('should return null for invalid email formats', () => {
    expect(extractEmailDomain('invalid')).toBeNull()
    expect(extractEmailDomain('')).toBeNull()
  })

  it('should handle edge cases with empty parts', () => {
    // Function returns empty string for malformed emails with @
    // These are handled by email regex validation elsewhere
    expect(extractEmailDomain('invalid@')).toBe('')
    expect(extractEmailDomain('@domain.com')).toBe('domain.com')
  })

  it('should return null for email with multiple @ signs', () => {
    expect(extractEmailDomain('user@domain@example.com')).toBeNull()
  })
})

describe('isPublicEmailDomain', () => {
  it('should return true for Gmail domains', () => {
    expect(isPublicEmailDomain('gmail.com')).toBe(true)
    expect(isPublicEmailDomain('googlemail.com')).toBe(true)
  })

  it('should return true for Polish public domains', () => {
    expect(isPublicEmailDomain('wp.pl')).toBe(true)
    expect(isPublicEmailDomain('o2.pl')).toBe(true)
    expect(isPublicEmailDomain('interia.pl')).toBe(true)
    expect(isPublicEmailDomain('onet.pl')).toBe(true)
  })

  it('should return true for other public domains', () => {
    expect(isPublicEmailDomain('hotmail.com')).toBe(true)
    expect(isPublicEmailDomain('outlook.com')).toBe(true)
    expect(isPublicEmailDomain('yahoo.com')).toBe(true)
    expect(isPublicEmailDomain('icloud.com')).toBe(true)
    expect(isPublicEmailDomain('protonmail.com')).toBe(true)
  })

  it('should return false for company domains', () => {
    expect(isPublicEmailDomain('firma.pl')).toBe(false)
    expect(isPublicEmailDomain('metaltech.pl')).toBe(false)
    expect(isPublicEmailDomain('company.com')).toBe(false)
    expect(isPublicEmailDomain('cnc-pilot.pl')).toBe(false)
  })

  it('should be case insensitive', () => {
    expect(isPublicEmailDomain('GMAIL.COM')).toBe(true)
    expect(isPublicEmailDomain('Gmail.Com')).toBe(true)
    expect(isPublicEmailDomain('WP.PL')).toBe(true)
  })
})
