// =====================================================
// QUOTES SYSTEM - TypeScript Types
// =====================================================

export interface Quote {
  id: string
  quote_number: string
  company_id: string

  // Customer
  customer_name: string
  customer_email: string | null
  customer_phone: string | null

  // Product
  part_name: string | null
  material: string | null
  quantity: number
  deadline: string | null

  // Pricing
  total_price: number
  price_per_unit: number | null
  breakdown: QuoteBreakdown | null

  // Metadata
  pricing_method: 'rule_based' | 'historical' | 'hybrid' | null
  confidence_score: number | null
  reasoning: string | null

  // Status
  status: QuoteStatus
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  expires_at: string | null

  // Portal
  token: string

  // Relations
  converted_order_id: string | null
  created_by: number | null

  // Timestamps
  created_at: string
  updated_at: string
}

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'

export interface QuoteBreakdown {
  materialCost: number
  laborCost: number
  setupCost: number
  marginPercentage: number
  totalCostBeforeMargin?: number
}

export interface QuoteItem {
  id: string
  quote_id: string
  part_name: string
  material: string | null
  quantity: number
  unit_price: number
  total_price: number
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  notes: string | null
  created_at: string
}

// =====================================================
// Quote with relations (for display)
// =====================================================
export interface QuoteWithRelations extends Quote {
  creator?: {
    id: number
    full_name: string
    email: string
  }
  companies?: {
    id: string
    name: string
  }
  converted_order?: {
    id: string
    order_number: string
    status: string
  }
  quote_items?: QuoteItem[]
}

// =====================================================
// Form data types
// =====================================================
export interface CreateQuoteInput {
  customer_name: string
  customer_email?: string
  customer_phone?: string
  part_name?: string
  material?: string
  quantity: number
  deadline?: string
  total_price: number
  breakdown?: QuoteBreakdown
  pricing_method?: 'rule_based' | 'historical' | 'hybrid'
  confidence_score?: number
  reasoning?: string
}

export interface ExpressQuoteFormData {
  customer_name: string
  customer_email: string
  part_name: string
  material: string
  quantity: number
  deadline: string
}

// =====================================================
// Unified Pricing Result (FREE version)
// =====================================================
export interface UnifiedPricingResult {
  recommended: {
    price: number
    pricePerUnit: number
    method: 'rule_based' | 'historical' | 'hybrid'
    confidence: number
    reasoning: string
    breakdown: QuoteBreakdown
  }
  estimates: {
    ruleBased: {
      price: number
      confidence: number
      breakdown: QuoteBreakdown
      reasoning: string
    } | null
    historical: {
      price: number
      confidence: number
      orderCount: number
      reasoning: string
      minPrice: number
      maxPrice: number
      avgDuration: number
    } | null
  }
}

// =====================================================
// Quote Statistics
// =====================================================
export interface QuoteStats {
  total_quotes: number
  draft_quotes: number
  sent_quotes: number
  accepted_quotes: number
  expired_quotes: number
  total_value: number
  acceptance_rate: number
}

// =====================================================
// API Response Types
// =====================================================
export interface CreateQuoteResponse {
  quote: Quote
  portal_url: string
  mailto_url: string
}

export interface AcceptQuoteResponse {
  success: boolean
  order_id: string
  order_number: string
}
