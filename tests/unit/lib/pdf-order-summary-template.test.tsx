import React from 'react'
import { describe, it, expect, vi } from 'vitest'

// Mock @react-pdf/renderer
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

import OrderSummaryTemplate from '@/lib/pdf/order-summary-template'
import type { OrderSummaryPdfData, CompanyBranding } from '@/lib/pdf/types'

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
  website: null,
  currency: 'PLN',
}

function makeOrderData(overrides: Partial<OrderSummaryPdfData> = {}): OrderSummaryPdfData {
  return {
    order_number: 'ZAM-2024-0042',
    status: 'in_progress',
    created_at: '2024-06-10T09:00:00Z',
    deadline: '2024-07-15',
    customer_name: 'Metalex Sp. z o.o.',
    part_name: 'Wałek napędowy',
    material: 'Stal 45',
    quantity: 20,
    notes: 'Zamówienie priorytetowe. Termin nieprzekraczalny.',
    total_cost: 8500,
    material_cost: 2000,
    labor_cost: 4500,
    overhead_cost: 2000,
    production_plans: [],
    company: mockCompany,
    creator_name: 'Adam Nowak',
    ...overrides,
  }
}

// ============================================
// OrderSummaryTemplate — component rendering
// ============================================
describe('OrderSummaryTemplate', () => {
  it('should render without errors with full data', () => {
    const data = makeOrderData()
    const element = React.createElement(OrderSummaryTemplate, { data })
    expect(element).toBeTruthy()
    expect(element.props.data.order_number).toBe('ZAM-2024-0042')
  })

  it('should render with production plan summaries', () => {
    const data = makeOrderData({
      production_plans: [
        {
          plan_number: 'PP-001',
          part_name: 'Wałek napędowy A',
          status: 'active',
          total_setup_time_minutes: 60,
          total_run_time_minutes: 200,
          estimated_cost: 3000,
          operations_count: 4,
        },
        {
          plan_number: 'PP-002',
          part_name: 'Wałek napędowy B',
          status: 'completed',
          total_setup_time_minutes: 45,
          total_run_time_minutes: 150,
          estimated_cost: 2500,
          operations_count: 3,
        },
      ],
    })

    const element = React.createElement(OrderSummaryTemplate, { data })
    expect(element).toBeTruthy()
    expect(element.props.data.production_plans).toHaveLength(2)
  })

  it('should render with no production plans', () => {
    const data = makeOrderData({ production_plans: [] })
    const element = React.createElement(OrderSummaryTemplate, { data })
    expect(element).toBeTruthy()
    expect(element.props.data.production_plans).toHaveLength(0)
  })

  it('should render with minimal data (no optional fields)', () => {
    const data = makeOrderData({
      deadline: null,
      material: null,
      notes: null,
      total_cost: null,
      material_cost: null,
      labor_cost: null,
      overhead_cost: null,
      creator_name: null,
    })

    const element = React.createElement(OrderSummaryTemplate, { data })
    expect(element).toBeTruthy()
  })

  it('should handle various status values', () => {
    const statuses = ['pending', 'in_progress', 'completed', 'delayed', 'cancelled', 'ready_to_ship', 'draft']

    for (const status of statuses) {
      const data = makeOrderData({ status })
      const element = React.createElement(OrderSummaryTemplate, { data })
      expect(element).toBeTruthy()
    }
  })

  it('should export OrderSummaryTemplate as default export', () => {
    expect(OrderSummaryTemplate).toBeDefined()
    expect(typeof OrderSummaryTemplate).toBe('function')
  })
})
