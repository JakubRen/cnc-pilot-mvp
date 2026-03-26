import { describe, it, expect, vi } from 'vitest'

// Mock @react-pdf/renderer before importing styles (styles.ts calls Font.register at import time)
vi.mock('@react-pdf/renderer', () => ({
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
  Font: {
    register: vi.fn(),
  },
}))

import { formatDatePL, formatPLN, sanitizeFileName, VIOLET } from '@/lib/pdf/styles'

// ============================================
// formatDatePL — Polish date formatting
// ============================================
describe('formatDatePL', () => {
  it('should format ISO date string to dd.MM.yyyy', () => {
    expect(formatDatePL('2024-01-15')).toBe('15.01.2024')
  })

  it('should format ISO datetime string', () => {
    expect(formatDatePL('2024-12-25T10:30:00Z')).toBe('25.12.2024')
  })

  it('should handle single-digit day and month with zero padding', () => {
    expect(formatDatePL('2024-03-05')).toBe('05.03.2024')
  })

  it('should return "-" for null', () => {
    expect(formatDatePL(null)).toBe('-')
  })

  it('should return "-" for undefined', () => {
    expect(formatDatePL(undefined)).toBe('-')
  })

  it('should return "-" for empty string', () => {
    expect(formatDatePL('')).toBe('-')
  })

  it('should return "-" for invalid date string', () => {
    expect(formatDatePL('not-a-date')).toBe('-')
  })

  it('should handle year 2000 edge case', () => {
    expect(formatDatePL('2000-01-01')).toBe('01.01.2000')
  })

  it('should handle end-of-year date', () => {
    expect(formatDatePL('2024-12-31')).toBe('31.12.2024')
  })
})

// ============================================
// formatPLN — Polish currency formatting
// ============================================
describe('formatPLN', () => {
  it('should format a standard amount', () => {
    expect(formatPLN(1500)).toBe('1 500,00 PLN')
  })

  it('should format zero', () => {
    expect(formatPLN(0)).toBe('0,00 PLN')
  })

  it('should format null as zero', () => {
    expect(formatPLN(null)).toBe('0,00 PLN')
  })

  it('should format undefined as zero', () => {
    expect(formatPLN(undefined)).toBe('0,00 PLN')
  })

  it('should format a negative amount', () => {
    expect(formatPLN(-500)).toBe('-500,00 PLN')
  })

  it('should format amount with decimal places', () => {
    expect(formatPLN(99.99)).toBe('99,99 PLN')
  })

  it('should round to 2 decimal places', () => {
    expect(formatPLN(10.999)).toBe('11,00 PLN')
  })

  it('should format large amounts with space separators', () => {
    expect(formatPLN(1234567.89)).toBe('1 234 567,89 PLN')
  })

  it('should format amounts under 1000 without spaces', () => {
    expect(formatPLN(999.50)).toBe('999,50 PLN')
  })

  it('should format exactly 1000', () => {
    expect(formatPLN(1000)).toBe('1 000,00 PLN')
  })

  it('should handle very small fractional amounts', () => {
    expect(formatPLN(0.01)).toBe('0,01 PLN')
  })

  it('should format a negative large amount', () => {
    expect(formatPLN(-12345.67)).toBe('-12 345,67 PLN')
  })
})

// ============================================
// sanitizeFileName — File name sanitization
// ============================================
describe('sanitizeFileName', () => {
  it('should keep simple ASCII names unchanged', () => {
    expect(sanitizeFileName('TestFile')).toBe('TestFile')
  })

  it('should replace spaces with underscores', () => {
    expect(sanitizeFileName('Jan Kowalski')).toBe('Jan_Kowalski')
  })

  it('should replace multiple spaces with single underscore', () => {
    expect(sanitizeFileName('Jan   Kowalski')).toBe('Jan_Kowalski')
  })

  it('should remove Polish diacritics (ą, ę, ś, ź, ć, ń, ó)', () => {
    expect(sanitizeFileName('ąęśźćńó')).toBe('aeszcno')
  })

  it('should handle Polish ł → l', () => {
    expect(sanitizeFileName('łóżko')).toBe('lozko')
  })

  it('should handle Polish Ł → L', () => {
    expect(sanitizeFileName('Łódź')).toBe('Lodz')
  })

  it('should handle a realistic Polish company name', () => {
    expect(sanitizeFileName('Śrubex Łódź Sp. z o.o.')).toBe('Srubex_Lodz_Sp._z_o.o.')
  })

  it('should remove special characters', () => {
    expect(sanitizeFileName('Test@#$%^&*()File')).toBe('TestFile')
  })

  it('should keep hyphens, underscores, dots, numbers', () => {
    expect(sanitizeFileName('File-Name_2024.v2')).toBe('File-Name_2024.v2')
  })

  it('should handle an empty string', () => {
    expect(sanitizeFileName('')).toBe('')
  })

  it('should remove all characters if entirely special', () => {
    expect(sanitizeFileName('!@#$%')).toBe('')
  })

  it('should handle mixed Polish and ASCII', () => {
    expect(sanitizeFileName('Wycena Żółty Kwiat')).toBe('Wycena_Zolty_Kwiat')
  })
})

// ============================================
// VIOLET constant
// ============================================
describe('VIOLET constant', () => {
  it('should be the correct hex color', () => {
    expect(VIOLET).toBe('#7c3aed')
  })
})
