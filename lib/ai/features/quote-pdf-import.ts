// Quote PDF/Image Import (Phase 2 — Feature 2.3)
// Validates, extracts text from, and processes PDF and image files
// for the parse-quote API. Supports:
// - PDF text extraction (text-based PDFs)
// - Image multimodal analysis (JPG/PNG/WebP via Gemini vision)
// - Customer auto-matching against existing DB customers

import { sanitizeUserInput, sanitizeField, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export type SupportedFileType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'

export interface ParseQuoteInput {
  fileName: string
  fileType: string
  fileSizeBytes: number
  content: string | Buffer // text for PDF, buffer for images
  companyId: string
}

export interface ParsedQuoteItem {
  partName: string
  material: string | null
  quantity: number
  unitPrice: number | null
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  notes: string | null
}

export interface CustomerMatch {
  customerId: string | null
  customerName: string
  customerEmail: string | null
  matchConfidence: number // 0-100
  isNewCustomer: boolean
}

export interface ParsedQuoteData {
  items: ParsedQuoteItem[]
  customer: CustomerMatch
  deadline: string | null
  rawSummary: string
  sourceType: 'pdf_text' | 'image_multimodal'
  sanitized: boolean
}

export interface FileValidationResult {
  valid: boolean
  error: string | null
}

// ============================================
// FILE VALIDATION
// ============================================

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const SUPPORTED_TYPES: string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

/**
 * Validate uploaded file type and size.
 */
export function validateFile(input: Pick<ParseQuoteInput, 'fileType' | 'fileSizeBytes'>): FileValidationResult {
  if (!SUPPORTED_TYPES.includes(input.fileType)) {
    return {
      valid: false,
      error: `Nieobslugiwany typ pliku: ${input.fileType}. Dozwolone: PDF, JPG, PNG, WebP.`,
    }
  }
  if (input.fileSizeBytes > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Plik za duzy: ${(input.fileSizeBytes / 1024 / 1024).toFixed(1)}MB. Maksimum: 10MB.`,
    }
  }
  if (input.fileSizeBytes === 0) {
    return { valid: false, error: 'Plik jest pusty.' }
  }
  return { valid: true, error: null }
}

/**
 * Determine whether a file type is an image (for multimodal processing).
 */
export function isImageType(fileType: string): boolean {
  return fileType.startsWith('image/')
}

// ============================================
// CUSTOMER AUTO-MATCHING
// ============================================

export interface ExistingCustomer {
  id: string
  name: string
  email: string | null
}

/**
 * Fuzzy match an extracted customer name against existing customers.
 */
export function fuzzyMatchCustomer(
  extractedName: string,
  existingCustomers: ExistingCustomer[]
): CustomerMatch {
  if (!extractedName || extractedName.trim().length === 0) {
    return {
      customerId: null,
      customerName: 'Unknown',
      customerEmail: null,
      matchConfidence: 0,
      isNewCustomer: true,
    }
  }

  const query = extractedName.toLowerCase().trim()

  for (const customer of existingCustomers) {
    const name = customer.name.toLowerCase()
    if (name === query) {
      return {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        matchConfidence: 100,
        isNewCustomer: false,
      }
    }
    if (name.includes(query) || query.includes(name)) {
      return {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        matchConfidence: 75,
        isNewCustomer: false,
      }
    }
  }

  return {
    customerId: null,
    customerName: extractedName,
    customerEmail: null,
    matchConfidence: 0,
    isNewCustomer: true,
  }
}

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitize all fields in parsed quote data.
 */
export function sanitizeQuoteData(raw: {
  items?: Array<Record<string, unknown>>
  customer_name?: string | null
  customer_email?: string | null
  deadline?: string | null
  raw_summary?: string | null
}): { items: ParsedQuoteItem[]; customerName: string | null; customerEmail: string | null; deadline: string | null; rawSummary: string } {
  const items: ParsedQuoteItem[] = (raw.items || []).map((item) => ({
    partName: sanitizeField(String(item.part_name || item.partName || ''), FIELD_LIMITS.SHORT) || 'Unknown part',
    material: item.material ? sanitizeField(String(item.material), FIELD_LIMITS.SHORT) : null,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    unitPrice: item.unit_price != null ? Number(item.unit_price) : (item.unitPrice != null ? Number(item.unitPrice) : null),
    dimensions: item.dimensions ? sanitizeField(String(item.dimensions), FIELD_LIMITS.DIMENSIONS) : null,
    complexity: ['simple', 'medium', 'complex'].includes(String(item.complexity))
      ? String(item.complexity) as 'simple' | 'medium' | 'complex'
      : null,
    notes: item.notes ? sanitizeField(String(item.notes), FIELD_LIMITS.MEDIUM) : null,
  }))

  return {
    items,
    customerName: raw.customer_name ? sanitizeField(raw.customer_name, FIELD_LIMITS.SHORT) : null,
    customerEmail: raw.customer_email ? sanitizeField(raw.customer_email, FIELD_LIMITS.SHORT) : null,
    deadline: raw.deadline || null,
    rawSummary: sanitizeField(raw.raw_summary || '', FIELD_LIMITS.MEDIUM),
  }
}

/**
 * Build inlineData part for Gemini multimodal API from image buffer.
 */
export function buildImagePart(buffer: Buffer, mimeType: string): { inlineData: { data: string; mimeType: string } } {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  }
}
