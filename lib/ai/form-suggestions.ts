'use server'

import { createClient } from '@/lib/supabase-server'
import { callGemini, SchemaType } from '@/lib/ai/gemini-client'
import { logger } from '@/lib/logger'
import type {
  FormSuggestionsInput,
  FormSuggestionsResponse,
  MaterialSuggestion,
  QuantitySuggestion,
  PriceSanityCheck,
} from '@/types/ai-form-suggestions'
import type {
  FormSuggestionsData,
  MaterialSuggestion as FrontendMaterialSuggestion,
  QuantitySuggestion as FrontendQuantitySuggestion,
} from '@/types/ai-expansion'

const MIN_ORDERS_FOR_AI = 3

// ============================================
// HISTORICAL DATA QUERY
// ============================================

interface HistoricalOrder {
  part_name: string
  material: string | null
  quantity: number
  selling_price: number | null
  customer_name: string
  created_at: string
}

async function fetchHistoricalOrders(
  companyId: string,
  input: FormSuggestionsInput
): Promise<HistoricalOrder[]> {
  const supabase = await createClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  let query = supabase
    .from('orders')
    .select('part_name, material, quantity, selling_price, customer_name, created_at')
    .eq('company_id', companyId)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(50)

  // Filter by material or part name if provided
  if (input.material) {
    query = query.ilike('material', `%${input.material}%`)
  } else if (input.partName) {
    query = query.ilike('part_name', `%${input.partName}%`)
  }

  const { data, error } = await query

  if (error) {
    logger.error('[form-suggestions] Error fetching historical orders', { error })
    return []
  }

  return data || []
}

async function fetchInventoryMaterials(companyId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .select('name')
    .eq('company_id', companyId)
    .limit(50)

  if (error) {
    logger.debug('[form-suggestions] Could not fetch inventory', { error })
    return []
  }

  return (data || []).map(item => item.name)
}

// ============================================
// HEURISTIC FALLBACK
// ============================================

function generateHeuristicSuggestions(
  orders: HistoricalOrder[],
  inventoryMaterials: string[],
  input: FormSuggestionsInput
): FormSuggestionsResponse {
  const materials: MaterialSuggestion[] = []
  const materialCounts = new Map<string, number>()

  // Count material occurrences from historical orders
  for (const order of orders) {
    if (order.material) {
      const mat = order.material.toLowerCase()
      materialCounts.set(mat, (materialCounts.get(mat) || 0) + 1)
    }
  }

  // Top materials by frequency
  const sorted = [...materialCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [mat, count] of sorted.slice(0, 5)) {
    const score = Math.min(100, Math.round((count / orders.length) * 100))
    materials.push({
      name: mat,
      matchScore: score,
      reason: `Uzywany w ${count} z ${orders.length} zlecen w ostatnich 90 dniach`,
    })
  }

  // Also suggest inventory materials not yet in the list
  for (const invMat of inventoryMaterials.slice(0, 3)) {
    const lower = invMat.toLowerCase()
    if (!materialCounts.has(lower)) {
      materials.push({
        name: invMat,
        matchScore: 30,
        reason: 'Dostepny w magazynie',
      })
    }
  }

  // Quantity suggestion
  let quantity: QuantitySuggestion | null = null
  if (orders.length >= MIN_ORDERS_FOR_AI) {
    const quantities = orders.map(o => o.quantity).filter(q => q > 0)
    if (quantities.length > 0) {
      const avg = Math.round(quantities.reduce((s, q) => s + q, 0) / quantities.length)
      quantity = {
        suggestedQuantity: avg,
        reason: `Srednia ilosc z ${quantities.length} podobnych zlecen`,
        basedOnOrders: quantities.length,
      }
    }
  }

  // Price sanity check
  let priceSanity: PriceSanityCheck | null = null
  if (input.sellingPrice && orders.length >= MIN_ORDERS_FOR_AI) {
    const prices = orders
      .map(o => o.selling_price)
      .filter((p): p is number => p !== null && p > 0)

    if (prices.length >= MIN_ORDERS_FOR_AI) {
      const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const deviation = Math.abs(input.sellingPrice - avgPrice) / avgPrice

      let status: PriceSanityCheck['status'] = 'ok'
      let message = 'Cena w normalnym zakresie'

      if (input.sellingPrice < avgPrice * 0.5) {
        status = 'too_low'
        message = `Cena ${input.sellingPrice} PLN jest znacznie ponizej sredniej ${avgPrice.toFixed(0)} PLN`
      } else if (input.sellingPrice > avgPrice * 2) {
        status = 'too_high'
        message = `Cena ${input.sellingPrice} PLN jest znacznie powyzej sredniej ${avgPrice.toFixed(0)} PLN`
      } else if (deviation > 0.3) {
        status = 'unusual'
        message = `Cena odbiega o ${(deviation * 100).toFixed(0)}% od sredniej ${avgPrice.toFixed(0)} PLN`
      }

      priceSanity = {
        status,
        message,
        avgHistoricalPrice: Math.round(avgPrice),
        suggestedRange: {
          min: Math.round(minPrice * 0.9),
          max: Math.round(maxPrice * 1.1),
        },
      }
    }
  }

  return { materials: materials.slice(0, 5), quantity, priceSanity }
}

// ============================================
// PUBLIC API
// ============================================

/** Frontend-compatible input (from useFormSuggestions hook) */
interface HookInput {
  partName?: string
  material?: string
  price?: number | null
}

function isHookInput(arg: unknown): arg is HookInput {
  return typeof arg === 'object' && arg !== null && !('sellingPrice' in (arg as Record<string, unknown>)) && ('partName' in (arg as Record<string, unknown>) || 'material' in (arg as Record<string, unknown>) || 'price' in (arg as Record<string, unknown>))
}

function toFrontendSuggestions(result: FormSuggestionsResponse): FormSuggestionsData {
  const materials: FrontendMaterialSuggestion[] = result.materials.map(m => ({
    name: m.name,
    matchScore: m.matchScore,
    source: 'history' as const,
  }))

  const quantities: FrontendQuantitySuggestion[] = result.quantity
    ? [{ value: result.quantity.suggestedQuantity, label: result.quantity.reason }]
    : []

  return {
    materials,
    quantities,
    priceSanity: result.priceSanity
      ? {
          status: result.priceSanity.status === 'unusual' ? 'warning' : result.priceSanity.status === 'too_low' ? 'low' : result.priceSanity.status === 'too_high' ? 'high' : 'ok',
          message: result.priceSanity.message,
          suggestedRange: result.priceSanity.suggestedRange,
        }
      : null,
  }
}

/**
 * Get real-time form suggestions for order creation.
 * Supports two calling conventions:
 * 1. getFormSuggestions(companyId, input) — backend/architect API
 * 2. getFormSuggestions({ partName, material, price }) — frontend hook API
 */
export async function getFormSuggestions(hookInput: HookInput): Promise<FormSuggestionsData>
export async function getFormSuggestions(companyId: string, input: FormSuggestionsInput): Promise<FormSuggestionsResponse>
export async function getFormSuggestions(
  companyIdOrInput: string | HookInput,
  input?: FormSuggestionsInput
): Promise<FormSuggestionsResponse | FormSuggestionsData> {
  // Frontend hook calling convention: single object arg
  if (isHookInput(companyIdOrInput)) {
    const hookInput = companyIdOrInput
    // Resolve companyId from auth context
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { materials: [], quantities: [], priceSanity: null } as FormSuggestionsData
      }
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userData?.company_id) {
        return { materials: [], quantities: [], priceSanity: null } as FormSuggestionsData
      }

      const formInput: FormSuggestionsInput = {
        partName: hookInput.partName,
        material: hookInput.material,
        sellingPrice: hookInput.price ?? undefined,
      }

      const result = await getFormSuggestionsInternal(userData.company_id, formInput)
      return toFrontendSuggestions(result)
    } catch (err) {
      logger.error('[form-suggestions] Hook-style call error', { error: err })
      return { materials: [], quantities: [], priceSanity: null } as FormSuggestionsData
    }
  }

  // Backend calling convention: (companyId, input)
  return getFormSuggestionsInternal(companyIdOrInput, input!)
}

async function getFormSuggestionsInternal(
  companyId: string,
  input: FormSuggestionsInput
): Promise<FormSuggestionsResponse> {
  const [orders, inventoryMaterials] = await Promise.all([
    fetchHistoricalOrders(companyId, input),
    fetchInventoryMaterials(companyId),
  ])

  // Gate: use heuristic for fewer than MIN_ORDERS_FOR_AI
  if (orders.length < MIN_ORDERS_FOR_AI) {
    logger.debug('[form-suggestions] < 3 orders, using heuristic', { orderCount: orders.length })
    return generateHeuristicSuggestions(orders, inventoryMaterials, input)
  }

  // Try Gemini for richer suggestions
  const result = await callGemini<FormSuggestionsResponse>({
    label: 'form-suggestions',
    prompt: buildPrompt(orders, inventoryMaterials, input),
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        materials: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING, description: 'Nazwa materialu' },
              matchScore: { type: SchemaType.NUMBER, description: 'Dopasowanie 0-100' },
              reason: { type: SchemaType.STRING, description: 'Uzasadnienie po polsku' },
            },
            required: ['name', 'matchScore', 'reason'],
          },
        },
        quantity: {
          type: SchemaType.OBJECT,
          nullable: true,
          properties: {
            suggestedQuantity: { type: SchemaType.NUMBER },
            reason: { type: SchemaType.STRING },
            basedOnOrders: { type: SchemaType.NUMBER },
          },
          required: ['suggestedQuantity', 'reason', 'basedOnOrders'],
        },
        priceSanity: {
          type: SchemaType.OBJECT,
          nullable: true,
          properties: {
            status: { type: SchemaType.STRING, description: 'ok, too_low, too_high, unusual' },
            message: { type: SchemaType.STRING },
            avgHistoricalPrice: { type: SchemaType.NUMBER },
            suggestedRange: {
              type: SchemaType.OBJECT,
              properties: {
                min: { type: SchemaType.NUMBER },
                max: { type: SchemaType.NUMBER },
              },
              required: ['min', 'max'],
            },
          },
          required: ['status', 'message', 'avgHistoricalPrice', 'suggestedRange'],
        },
      },
      required: ['materials'],
    },
    temperature: 0.2,
  })

  if (result) {
    return result.data
  }

  // Fallback to heuristic
  return generateHeuristicSuggestions(orders, inventoryMaterials, input)
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildPrompt(
  orders: HistoricalOrder[],
  inventoryMaterials: string[],
  input: FormSuggestionsInput
): string {
  const ordersPreview = orders.slice(0, 20).map(o => ({
    part: o.part_name,
    material: o.material,
    qty: o.quantity,
    price: o.selling_price,
    customer: o.customer_name,
  }))

  return `Jestes asystentem CNC pomagajacym wypelnic formularz nowego zlecenia.

KONTEKST NOWEGO ZLECENIA:
- Nazwa detalu: ${input.partName || '(nie podano)'}
- Material: ${input.material || '(nie podano)'}
- Klient: ${input.customerName || '(nie podano)'}
- Ilosc: ${input.quantity || '(nie podano)'}
- Cena sprzedazy: ${input.sellingPrice ? `${input.sellingPrice} PLN` : '(nie podano)'}

HISTORIA ZLECEN (ostatnie 90 dni, max 20):
${JSON.stringify(ordersPreview, null, 2)}

MATERIALY W MAGAZYNIE:
${inventoryMaterials.slice(0, 15).join(', ') || 'brak danych'}

ZADANIE:
1. materials: podaj do 5 sugerowanych materialow z dopasowaniem (matchScore 0-100) i uzasadnieniem
2. quantity: jesli mozna, zasugeruj ilosc na podstawie historii (lub null)
3. priceSanity: jesli podano cene, sprawdz czy jest w normalnym zakresie (lub null)

Wszystko po polsku. Opieraj sie TYLKO na podanych danych.`
}
