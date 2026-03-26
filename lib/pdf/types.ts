// =====================================================
// PDF Generation — Data Contracts
// =====================================================
// These interfaces define the data shape passed to PDF templates.
// They are intentionally flat/simple — mapped from DB types at the API layer.

// -----------------------------------------------------
// Company Branding (shared across all PDF types)
// -----------------------------------------------------
export interface CompanyBranding {
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  logo_url?: string | null
  nip?: string | null          // Polish tax ID
  bank_account?: string | null
  website?: string | null
  currency: string             // default 'PLN'
}

// -----------------------------------------------------
// Quote PDF
// -----------------------------------------------------
export interface QuotePdfData {
  quote_number: string
  created_at: string
  expires_at?: string | null
  status: string

  // Customer
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null

  // Single-item legacy fields (from Quote root)
  part_name?: string | null
  material?: string | null
  quantity?: number | null

  // Pricing
  total_price: number
  price_per_unit?: number | null
  breakdown?: {
    materialCost: number
    laborCost: number
    setupCost: number
    marginPercentage: number
    totalCostBeforeMargin?: number
  } | null

  // Multi-item quotes
  items: QuotePdfItem[]

  notes?: string | null
  company: CompanyBranding
  creator_name?: string | null
}

export interface QuotePdfItem {
  part_name: string
  material?: string | null
  quantity: number
  unit_price: number
  total_price: number
  dimensions?: string | null
  complexity?: 'simple' | 'medium' | 'complex' | null
  notes?: string | null
}

// -----------------------------------------------------
// Production Plan PDF
// -----------------------------------------------------
export interface ProductionPlanPdfData {
  plan_number: string
  status: string
  created_at: string

  // Order context
  order_number?: string | null
  customer_name?: string | null
  deadline?: string | null

  // Product
  part_name: string
  quantity: number
  material?: string | null
  dimensions?: { length?: number | null; width?: number | null; height?: number | null } | null
  technical_notes?: string | null

  // Time & cost summary
  total_setup_time_minutes: number
  total_run_time_minutes: number
  estimated_cost?: number | null

  // Operations breakdown
  operations: OperationPdfData[]

  company: CompanyBranding
}

export interface OperationPdfData {
  operation_number: number
  operation_type: string
  operation_name: string
  machine_name?: string | null
  setup_time_minutes: number
  run_time_per_unit_minutes: number
  total_setup_cost?: number | null
  total_run_cost?: number | null
  total_operation_cost?: number | null
  status: string
  assigned_operator?: string | null
}

// -----------------------------------------------------
// Order Summary PDF
// -----------------------------------------------------
export interface OrderSummaryPdfData {
  order_number: string
  status: string
  created_at: string
  deadline?: string | null

  // Customer
  customer_name: string

  // Single-order fields
  part_name: string
  material?: string | null
  quantity: number
  notes?: string | null

  // Costs
  total_cost?: number | null
  material_cost?: number | null
  labor_cost?: number | null
  overhead_cost?: number | null

  // Production plans attached to this order
  production_plans: OrderProductionPlanSummary[]

  company: CompanyBranding
  creator_name?: string | null
}

export interface OrderProductionPlanSummary {
  plan_number: string
  part_name: string
  status: string
  total_setup_time_minutes: number
  total_run_time_minutes: number
  estimated_cost?: number | null
  operations_count: number
}
