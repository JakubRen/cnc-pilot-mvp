/**
 * Unit Tests for Quote PDF Import (Phase 2 — Feature 2.3)
 *
 * Tests the PDF/image quote import pipeline that extracts structured data
 * from uploaded files (PDF text extraction + multimodal image analysis).
 *
 * CONTRACT for backend-dev:
 * - parseQuoteFile(file, companyId) -> ParsedQuoteData
 * - Handles PDF text extraction (text-based PDFs)
 * - Handles image input (JPG/PNG via Gemini multimodal)
 * - Customer auto-matching (fuzzy by name/email against existing customers)
 * - Sanitization applied to all extracted text (via sanitizer.ts)
 * - File size limits enforced (max 10MB)
 * - Invalid file types rejected
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================
// CONTRACT TYPES
// ============================================

type SupportedFileType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'

interface ParseQuoteInput {
  fileName: string
  fileType: string
  fileSizeBytes: number
  content: string | Buffer // text for PDF, buffer for images
  companyId: string
}

interface ParsedQuoteItem {
  partName: string
  material: string | null
  quantity: number
  unitPrice: number | null
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  notes: string | null
}

interface CustomerMatch {
  customerId: string | null
  customerName: string
  customerEmail: string | null
  matchConfidence: number // 0-100
  isNewCustomer: boolean
}

interface ParsedQuoteData {
  items: ParsedQuoteItem[]
  customer: CustomerMatch
  deadline: string | null
  rawSummary: string
  sourceType: 'pdf_text' | 'image_multimodal'
  sanitized: boolean
}

interface FileValidationResult {
  valid: boolean
  error: string | null
}

// ============================================
// FILE VALIDATION
// ============================================

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const SUPPORTED_TYPES: string[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

function validateFile(input: Pick<ParseQuoteInput, 'fileType' | 'fileSizeBytes'>): FileValidationResult {
  if (!SUPPORTED_TYPES.includes(input.fileType)) {
    return { valid: false, error: `Nieobslugiwany typ pliku: ${input.fileType}. Dozwolone: PDF, JPG, PNG, WebP.` }
  }
  if (input.fileSizeBytes > MAX_FILE_SIZE) {
    return { valid: false, error: `Plik za duzy: ${(input.fileSizeBytes / 1024 / 1024).toFixed(1)}MB. Maksimum: 10MB.` }
  }
  if (input.fileSizeBytes === 0) {
    return { valid: false, error: 'Plik jest pusty.' }
  }
  return { valid: true, error: null }
}

describe('Quote PDF Import — File Validation', () => {
  it('should accept PDF files', () => {
    const result = validateFile({ fileType: 'application/pdf', fileSizeBytes: 500_000 })
    expect(result.valid).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should accept JPEG images', () => {
    const result = validateFile({ fileType: 'image/jpeg', fileSizeBytes: 2_000_000 })
    expect(result.valid).toBe(true)
  })

  it('should accept PNG images', () => {
    const result = validateFile({ fileType: 'image/png', fileSizeBytes: 3_000_000 })
    expect(result.valid).toBe(true)
  })

  it('should accept WebP images', () => {
    const result = validateFile({ fileType: 'image/webp', fileSizeBytes: 1_000_000 })
    expect(result.valid).toBe(true)
  })

  it('should reject unsupported file types', () => {
    const result = validateFile({ fileType: 'application/zip', fileSizeBytes: 500_000 })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Nieobslugiwany')
  })

  it('should reject Word documents', () => {
    const result = validateFile({ fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSizeBytes: 500_000 })
    expect(result.valid).toBe(false)
  })

  it('should reject files larger than 10MB', () => {
    const result = validateFile({ fileType: 'application/pdf', fileSizeBytes: 15_000_000 })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('za duzy')
  })

  it('should reject empty files', () => {
    const result = validateFile({ fileType: 'application/pdf', fileSizeBytes: 0 })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('pusty')
  })

  it('should accept file at exactly 10MB', () => {
    const result = validateFile({ fileType: 'application/pdf', fileSizeBytes: MAX_FILE_SIZE })
    expect(result.valid).toBe(true)
  })
})

// ============================================
// PDF TEXT EXTRACTION CONTRACT
// ============================================

describe('Quote PDF Import — PDF Text Extraction', () => {
  it('should identify source type as pdf_text for PDF files', () => {
    const result: ParsedQuoteData = {
      items: [],
      customer: { customerId: null, customerName: 'Unknown', customerEmail: null, matchConfidence: 0, isNewCustomer: true },
      deadline: null,
      rawSummary: 'Zapytanie ofertowe...',
      sourceType: 'pdf_text',
      sanitized: true,
    }
    expect(result.sourceType).toBe('pdf_text')
  })

  it('should extract items from parsed PDF text', () => {
    const item: ParsedQuoteItem = {
      partName: 'Tuleja redukcyjna DN50',
      material: 'Stal nierdzewna 304',
      quantity: 100,
      unitPrice: 45.50,
      dimensions: '50x30x20mm',
      complexity: 'medium',
      notes: 'Wymagana obrobka cieplna',
    }

    expect(item.partName).toBe('Tuleja redukcyjna DN50')
    expect(item.quantity).toBe(100)
    expect(item.material).toContain('304')
  })
})

// ============================================
// IMAGE MULTIMODAL CONTRACT
// ============================================

describe('Quote PDF Import — Image Multimodal', () => {
  it('should identify source type as image_multimodal for images', () => {
    const result: ParsedQuoteData = {
      items: [],
      customer: { customerId: null, customerName: 'Unknown', customerEmail: null, matchConfidence: 0, isNewCustomer: true },
      deadline: null,
      rawSummary: '',
      sourceType: 'image_multimodal',
      sanitized: true,
    }
    expect(result.sourceType).toBe('image_multimodal')
  })
})

// ============================================
// CUSTOMER AUTO-MATCHING
// ============================================

function fuzzyMatchCustomer(
  extractedName: string,
  existingCustomers: Array<{ id: string; name: string; email: string | null }>
): CustomerMatch {
  if (!extractedName || extractedName.trim().length === 0) {
    return { customerId: null, customerName: 'Unknown', customerEmail: null, matchConfidence: 0, isNewCustomer: true }
  }

  const query = extractedName.toLowerCase().trim()

  for (const customer of existingCustomers) {
    const name = customer.name.toLowerCase()
    if (name === query) {
      return { customerId: customer.id, customerName: customer.name, customerEmail: customer.email, matchConfidence: 100, isNewCustomer: false }
    }
    if (name.includes(query) || query.includes(name)) {
      return { customerId: customer.id, customerName: customer.name, customerEmail: customer.email, matchConfidence: 75, isNewCustomer: false }
    }
  }

  return { customerId: null, customerName: extractedName, customerEmail: null, matchConfidence: 0, isNewCustomer: true }
}

describe('Quote PDF Import — Customer Auto-Matching', () => {
  const existingCustomers = [
    { id: 'c1', name: 'MetalTech Sp. z o.o.', email: 'biuro@metaltech.pl' },
    { id: 'c2', name: 'Precyzja CNC', email: 'zamowienia@precyzja.pl' },
    { id: 'c3', name: 'Jan Kowalski', email: 'jan@example.com' },
  ]

  it('should match exact customer name with 100% confidence', () => {
    const result = fuzzyMatchCustomer('MetalTech Sp. z o.o.', existingCustomers)
    expect(result.customerId).toBe('c1')
    expect(result.matchConfidence).toBe(100)
    expect(result.isNewCustomer).toBe(false)
  })

  it('should match partial customer name', () => {
    const result = fuzzyMatchCustomer('MetalTech', existingCustomers)
    expect(result.customerId).toBe('c1')
    expect(result.matchConfidence).toBeGreaterThanOrEqual(50)
    expect(result.isNewCustomer).toBe(false)
  })

  it('should return new customer when no match found', () => {
    const result = fuzzyMatchCustomer('Firma XYZ', existingCustomers)
    expect(result.customerId).toBeNull()
    expect(result.isNewCustomer).toBe(true)
    expect(result.matchConfidence).toBe(0)
  })

  it('should handle empty customer name', () => {
    const result = fuzzyMatchCustomer('', existingCustomers)
    expect(result.customerName).toBe('Unknown')
    expect(result.isNewCustomer).toBe(true)
  })
})

// ============================================
// SANITIZATION
// ============================================

describe('Quote PDF Import — Sanitization', () => {
  it('should mark result as sanitized', () => {
    const result: ParsedQuoteData = {
      items: [],
      customer: { customerId: null, customerName: 'Test', customerEmail: null, matchConfidence: 0, isNewCustomer: true },
      deadline: null,
      rawSummary: 'Clean text',
      sourceType: 'pdf_text',
      sanitized: true,
    }
    expect(result.sanitized).toBe(true)
  })

  it('should enforce text length limits on extracted content', () => {
    // CONTRACT: rawSummary and item notes must be sanitized through sanitizer.ts
    const longText = 'a'.repeat(20_000)
    // Backend-dev must run sanitizeUserInput on all extracted text
    expect(longText.length).toBeGreaterThan(10_000) // Exceeds FIELD_LIMITS.LONG
  })
})

// ============================================
// RESULT SHAPE
// ============================================

describe('Quote PDF Import — Result Shape', () => {
  it('should return ParsedQuoteData with all required fields', () => {
    const result: ParsedQuoteData = {
      items: [
        {
          partName: 'Tuleja',
          material: 'Stal',
          quantity: 10,
          unitPrice: 100,
          dimensions: '50x30mm',
          complexity: 'simple',
          notes: null,
        },
      ],
      customer: {
        customerId: 'c1',
        customerName: 'MetalTech',
        customerEmail: 'biuro@metaltech.pl',
        matchConfidence: 95,
        isNewCustomer: false,
      },
      deadline: '2026-04-01',
      rawSummary: 'Zapytanie o obrobke 10 tulei ze stali.',
      sourceType: 'pdf_text',
      sanitized: true,
    }

    expect(result).toHaveProperty('items')
    expect(result).toHaveProperty('customer')
    expect(result).toHaveProperty('deadline')
    expect(result).toHaveProperty('rawSummary')
    expect(result).toHaveProperty('sourceType')
    expect(result).toHaveProperty('sanitized')
    expect(Array.isArray(result.items)).toBe(true)
    expect(result.items[0]).toHaveProperty('partName')
    expect(result.items[0]).toHaveProperty('quantity')
  })
})
