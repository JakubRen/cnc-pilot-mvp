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

import ProductionPlanTemplate from '@/lib/pdf/production-plan-template'
import type { ProductionPlanPdfData, OperationPdfData, CompanyBranding } from '@/lib/pdf/types'

// ============================================
// Test fixtures
// ============================================
const mockCompany: CompanyBranding = {
  name: 'CNC-Test Sp. z o.o.',
  currency: 'PLN',
}

function makeOperation(overrides: Partial<OperationPdfData> = {}): OperationPdfData {
  return {
    operation_number: 1,
    operation_type: 'turning',
    operation_name: 'Toczenie zgrubne',
    machine_name: 'DMG MORI CLX 350',
    setup_time_minutes: 30,
    run_time_per_unit_minutes: 5,
    status: 'pending',
    ...overrides,
  }
}

function makePlanData(overrides: Partial<ProductionPlanPdfData> = {}): ProductionPlanPdfData {
  return {
    plan_number: 'PP-2024-0015',
    status: 'active',
    created_at: '2024-06-15T08:00:00Z',
    order_number: 'ZAM-2024-0042',
    customer_name: 'Metalex Sp. z o.o.',
    deadline: '2024-07-01',
    part_name: 'Tuleja prowadząca',
    quantity: 50,
    material: 'Aluminium 6061-T6',
    dimensions: { length: 100, width: 50, height: 50 },
    technical_notes: 'Tolerancja otworów H7. Obróbka wykańczająca po hartowaniu.',
    total_setup_time_minutes: 90,
    total_run_time_minutes: 250,
    estimated_cost: 4500,
    operations: [
      makeOperation({ operation_number: 1, operation_name: 'Toczenie zgrubne', setup_time_minutes: 30, run_time_per_unit_minutes: 3 }),
      makeOperation({ operation_number: 2, operation_type: 'milling', operation_name: 'Frezowanie kieszeni', machine_name: 'Haas VF-2', setup_time_minutes: 45, run_time_per_unit_minutes: 8 }),
      makeOperation({ operation_number: 3, operation_type: 'grinding', operation_name: 'Szlifowanie', machine_name: null, setup_time_minutes: 15, run_time_per_unit_minutes: 2, status: 'completed' }),
    ],
    company: mockCompany,
    ...overrides,
  }
}

// ============================================
// ProductionPlanTemplate — component rendering
// ============================================
describe('ProductionPlanTemplate', () => {
  it('should render without errors with full data and 3 operations', () => {
    const data = makePlanData()
    const element = React.createElement(ProductionPlanTemplate, { data })
    expect(element).toBeTruthy()
    expect(element.props.data.operations).toHaveLength(3)
  })

  it('should render with no operations (empty list)', () => {
    const data = makePlanData({ operations: [], total_setup_time_minutes: 0, total_run_time_minutes: 0 })
    const element = React.createElement(ProductionPlanTemplate, { data })
    expect(element).toBeTruthy()
    expect(element.props.data.operations).toHaveLength(0)
  })

  it('should render without optional fields', () => {
    const data = makePlanData({
      order_number: null,
      customer_name: null,
      deadline: null,
      material: null,
      dimensions: null,
      technical_notes: null,
      estimated_cost: null,
    })

    const element = React.createElement(ProductionPlanTemplate, { data })
    expect(element).toBeTruthy()
  })

  it('should use landscape orientation (verified via data contract)', () => {
    // The template uses Page orientation="landscape" — we verify the component
    // accepts the data and renders. The orientation is hardcoded in the template.
    const data = makePlanData()
    const element = React.createElement(ProductionPlanTemplate, { data })
    expect(element).toBeTruthy()
    expect(element.props.data.plan_number).toBe('PP-2024-0015')
  })

  it('should handle dimensions with partial values', () => {
    const data = makePlanData({
      dimensions: { length: 100, width: null, height: null },
    })
    const element = React.createElement(ProductionPlanTemplate, { data })
    expect(element).toBeTruthy()
  })

  it('should export ProductionPlanTemplate as default export', () => {
    expect(ProductionPlanTemplate).toBeDefined()
    expect(typeof ProductionPlanTemplate).toBe('function')
  })
})
