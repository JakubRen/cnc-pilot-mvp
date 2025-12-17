// =====================================================
// CONTRACTOR TYPES (Customers/Suppliers/Cooperators)
// =====================================================

export type ContractorType = 'client' | 'supplier' | 'cooperator'

export interface Customer {
  id: string
  company_id: string

  // Type
  type: ContractorType

  // Basic info
  name: string

  // Contact info
  email: string | null
  phone: string | null
  nip: string | null

  // Address
  street: string | null
  city: string | null
  postal_code: string | null
  country: string | null

  // Additional
  notes: string | null

  // Metadata
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  name: string
  email?: string
  phone?: string
  nip?: string
  street?: string
  city?: string
  postal_code?: string
  country?: string
  notes?: string
}

export interface CustomerSearchResult {
  id: string
  name: string
  email: string | null
  phone: string | null
  nip: string | null
}

export interface CustomerWithStats extends Customer {
  total_quotes: number
  total_orders: number
  total_revenue: number
  last_order_date: string | null
}
