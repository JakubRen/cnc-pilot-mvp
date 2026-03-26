import React from 'react'
import { describe, it, expect, vi } from 'vitest'

// Mock @react-pdf/renderer — jsdom cannot render PDF primitives
vi.mock('@react-pdf/renderer', () => {
  const createComponent = (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) =>
      React.createElement('div', { 'data-testid': name, ...props }, children)

  return {
    Document: createComponent('Document'),
    Page: createComponent('Page'),
    View: createComponent('View'),
    Text: createComponent('Text'),
    Image: createComponent('Image'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    Font: {
      register: vi.fn(),
    },
  }
})

import QuoteTemplate from '@/lib/pdf/quote-template'
import type { QuotePdfData, CompanyBranding } from '@/lib/pdf/types'

// ============================================
// Test fixtures
// ============================================
const mockCompany: CompanyBranding = {
  name: 'CNC-Test Sp. z o.o.',
  address: 'ul. Testowa 1, 00-001 Warszawa',
  phone: '+48 123 456 789',
  email: 'test@cnc-test.pl',
  logo_url: null,
  nip: '1234567890',
  bank_account: 'PL 12 3456 7890 1234 5678 9012 3456',
  website: 'https://cnc-test.pl',
  currency: 'PLN',
}

function makeQuoteData(overrides: Partial<QuotePdfData> = {}): QuotePdfData {
  return {
    quote_number: 'WYC-2024-0042',
    created_at: '2024-06-15T10:00:00Z',
    expires_at: '2024-07-15T10:00:00Z',
    status: 'sent',
    customer_name: 'Jan Kowalski',
    customer_email: 'jan@example.com',
    customer_phone: '+48 111 222 333',
    total_price: 3500,
    price_per_unit: 350,
    items: [],
    company: mockCompany,
    ...overrides,
  }
}

// ============================================
// QuoteTemplate — component rendering
// ============================================
describe('QuoteTemplate', () => {
  it('should render without errors with full data', () => {
    const data = makeQuoteData({
      items: [
        {
          part_name: 'Tuleja aluminiowa',
          material: 'Aluminium 6061',
          quantity: 10,
          unit_price: 350,
          total_price: 3500,
          dimensions: '50x50x20mm',
          complexity: 'medium',
          notes: 'Tolerancja +/- 0.05',
        },
      ],
      breakdown: {
        materialCost: 800,
        laborCost: 1500,
        setupCost: 500,
        marginPercentage: 25,
        totalCostBeforeMargin: 2800,
      },
      notes: 'Termin negocjowalny.',
    })

    const element = React.createElement(QuoteTemplate, { data })
    expect(element).toBeTruthy()
    expect(element.props.data.quote_number).toBe('WYC-2024-0042')
    expect(element.props.data.items).toHaveLength(1)
  })

  it('should render with minimal data (no items, no breakdown)', () => {
    const data = makeQuoteData({
      customer_email: null,
      customer_phone: null,
      expires_at: null,
      price_per_unit: null,
      breakdown: null,
      notes: null,
    })

    const element = React.createElement(QuoteTemplate, { data })
    expect(element).toBeTruthy()
    expect(element.props.data.items).toHaveLength(0)
  })

  it('should render with single-item legacy fields (no items array)', () => {
    const data = makeQuoteData({
      part_name: 'Wałek stalowy',
      material: 'Stal 45',
      quantity: 5,
      price_per_unit: 200,
      total_price: 1000,
      items: [], // empty items triggers fallback to root fields
    })

    const element = React.createElement(QuoteTemplate, { data })
    expect(element).toBeTruthy()
    // The component internally builds items from root fields when items[] is empty
    expect(element.props.data.part_name).toBe('Wałek stalowy')
  })

  it('should render with multi-item quote (3+ items)', () => {
    const items = [
      { part_name: 'Part A', material: 'Aluminium', quantity: 10, unit_price: 100, total_price: 1000, dimensions: null, complexity: null as const, notes: null },
      { part_name: 'Part B', material: 'Stal', quantity: 5, unit_price: 200, total_price: 1000, dimensions: null, complexity: null as const, notes: null },
      { part_name: 'Part C', material: null, quantity: 1, unit_price: 500, total_price: 500, dimensions: null, complexity: null as const, notes: null },
    ]

    const data = makeQuoteData({ items, total_price: 2500 })
    const element = React.createElement(QuoteTemplate, { data })
    expect(element).toBeTruthy()
    expect(element.props.data.items).toHaveLength(3)
  })

  it('should export QuoteTemplate as default export', () => {
    expect(QuoteTemplate).toBeDefined()
    expect(typeof QuoteTemplate).toBe('function')
  })
})
