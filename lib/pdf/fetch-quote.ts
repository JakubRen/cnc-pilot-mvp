import { createClient } from '@/lib/supabase-server'
import { fetchCompanyBranding } from './fetch-company'
import type { QuotePdfData, QuotePdfItem } from './types'

/**
 * Fetch quote data for PDF generation.
 * Returns null if quote not found or doesn't belong to the given company.
 */
export async function fetchQuotePdfData(
  quoteId: string,
  companyId: string
): Promise<QuotePdfData | null> {
  const supabase = await createClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('company_id', companyId)
    .single()

  if (error || !quote) {
    console.error('[fetchQuotePdfData] Query failed:', { quoteId, companyId, error: error?.message })
    return null
  }

  // Fetch quote items separately (same pattern as quotes page)
  const { data: quoteItems } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: true })

  // Fetch creator name
  let creatorName: string | null = null
  if (quote.created_by) {
    const { data: creator } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', quote.created_by)
      .single()
    creatorName = creator?.full_name || null
  }

  const company = await fetchCompanyBranding(companyId)

  const items: QuotePdfItem[] = (quoteItems || []).map((item: Record<string, unknown>) => ({
    part_name: item.part_name as string,
    material: item.material as string | null,
    quantity: item.quantity as number,
    unit_price: item.unit_price as number,
    total_price: item.total_price as number,
    dimensions: item.dimensions as string | null,
    complexity: item.complexity as QuotePdfItem['complexity'],
    notes: item.notes as string | null,
  }))

  return {
    quote_number: quote.quote_number,
    created_at: quote.created_at,
    expires_at: quote.expires_at,
    status: quote.status,
    customer_name: quote.customer_name,
    customer_email: quote.customer_email,
    customer_phone: quote.customer_phone,
    part_name: quote.part_name,
    material: quote.material,
    quantity: quote.quantity,
    total_price: quote.total_price,
    price_per_unit: quote.price_per_unit,
    breakdown: quote.breakdown,
    items,
    notes: quote.notes,
    company,
    creator_name: creatorName,
  }
}

/**
 * Fetch quote data by public token (no auth required).
 * Validates token exists, quote is not expired, and returns PDF data.
 */
export async function fetchQuotePdfDataByToken(
  token: string
): Promise<QuotePdfData | null> {
  const supabase = await createClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !quote) return null

  // Check if quote is expired
  if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
    return null
  }

  // Fetch quote items separately
  const { data: quoteItems } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quote.id)
    .order('created_at', { ascending: true })

  // Fetch creator name
  let creatorName: string | null = null
  if (quote.created_by) {
    const { data: creator } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', quote.created_by)
      .single()
    creatorName = creator?.full_name || null
  }

  const company = await fetchCompanyBranding(quote.company_id)

  const items: QuotePdfItem[] = (quoteItems || []).map((item: Record<string, unknown>) => ({
    part_name: item.part_name as string,
    material: item.material as string | null,
    quantity: item.quantity as number,
    unit_price: item.unit_price as number,
    total_price: item.total_price as number,
    dimensions: item.dimensions as string | null,
    complexity: item.complexity as QuotePdfItem['complexity'],
    notes: item.notes as string | null,
  }))

  return {
    quote_number: quote.quote_number,
    created_at: quote.created_at,
    expires_at: quote.expires_at,
    status: quote.status,
    customer_name: quote.customer_name,
    customer_email: quote.customer_email,
    customer_phone: quote.customer_phone,
    part_name: quote.part_name,
    material: quote.material,
    quantity: quote.quantity,
    total_price: quote.total_price,
    price_per_unit: quote.price_per_unit,
    breakdown: quote.breakdown,
    items,
    notes: quote.notes,
    company,
    creator_name: creatorName,
  }
}
