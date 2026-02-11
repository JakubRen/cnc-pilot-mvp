// AI Form Suggestions types
// Used by: lib/ai/form-suggestions.ts

export interface MaterialSuggestion {
  name: string
  matchScore: number
  reason: string
}

export interface QuantitySuggestion {
  suggestedQuantity: number
  reason: string
  basedOnOrders: number
}

export interface PriceSanityCheck {
  status: 'ok' | 'too_low' | 'too_high' | 'unusual'
  message: string
  avgHistoricalPrice: number
  suggestedRange: {
    min: number
    max: number
  }
}

export interface FormSuggestionsInput {
  partName?: string
  material?: string
  customerName?: string
  quantity?: number
  sellingPrice?: number
}

export interface FormSuggestionsResponse {
  materials: MaterialSuggestion[]
  quantity: QuantitySuggestion | null
  priceSanity: PriceSanityCheck | null
}
