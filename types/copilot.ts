// ============================================
// Phase 4: CNC Copilot — Types & Contracts
// ============================================

import type { OrderCompletionLikelihood } from '@/lib/ai/features/deadline-monitor'
import type { PriceEstimateResult } from '@/lib/ai/price-estimator'
import type { GeneratedPlan } from '@/lib/ai/features/production-plan-generator'

// ============================================
// COPILOT CONTEXT
// ============================================

export interface CopilotContext {
  currentPage: string // e.g. '/orders', '/inventory', '/orders/abc-123'
  selectedOrderId?: string
  selectedCustomerName?: string
  selectedProductId?: string
}

// ============================================
// CONVERSATION
// ============================================

export interface ConversationMetadata {
  id: string
  company_id: string
  user_id: number
  title: string | null
  message_count: number
  created_at: string
  updated_at: string
}

export interface ConversationRow {
  id: string
  company_id: string
  user_id: number
  title: string | null
  messages: ConversationMessage[]
  context: Record<string, unknown>
  message_count: number
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
  toolInvocations?: Array<{
    toolName: CopilotToolName
    args: Record<string, unknown>
    result?: unknown
  }>
}

// ============================================
// TOOL NAMES
// ============================================

export type CopilotToolName =
  | 'search_orders'
  | 'search_inventory'
  | 'get_customer'
  | 'check_deadlines'
  | 'generate_quote'
  | 'get_production_plan'

// ============================================
// TOOL PARAMS
// ============================================

export interface SearchOrdersParams {
  query?: string
  status?: string
  customer_name?: string
  date_from?: string
  date_to?: string
  limit?: number
}

export interface SearchInventoryParams {
  query: string
  category?: string
}

export interface GetCustomerParams {
  customer_name: string
}

export interface CheckDeadlinesParams {
  days_ahead?: number
}

export interface GenerateQuoteParams {
  material: string
  dimensions?: string
  complexity?: 'low' | 'medium' | 'high'
  quantity?: number
  additionalNotes?: string
}

export interface GetProductionPlanParams {
  partName: string
  material: string
  quantity: number
  complexity: 'simple' | 'medium' | 'complex'
}

// ============================================
// TOOL RESULTS
// ============================================

export interface SearchOrdersResult {
  id: string
  order_number: string
  customer_name: string
  part_name: string
  material: string | null
  quantity: number
  status: string
  deadline: string | null
  selling_price: number | null
  created_at: string
}

export interface SearchInventoryResult {
  id: string
  name: string
  sku: string
  category: string
  unit: string
  description: string | null
  available_quantity: number
}

export interface GetCustomerResult {
  name: string
  profile: {
    customerName: string
    orderCount: number
    totalRevenue: number
    lastOrderDate: string
    churnScore: number
  } | null
  buyingPatterns: unknown
  aiAnalysis: string | null
}

/** Reuse existing type from deadline-monitor */
export type CheckDeadlinesResult = OrderCompletionLikelihood[]

/** Reuse existing type from price-estimator */
export type GenerateQuoteResult = PriceEstimateResult

/** Reuse existing type from production-plan-generator */
export type GetProductionPlanResult = GeneratedPlan

// ============================================
// EMBEDDINGS
// ============================================

export type EmbeddingSourceType = 'product' | 'order' | 'customer' | 'machine' | 'knowledge_entry'

export interface EmbeddingRecord {
  id: string
  company_id: string
  source_type: EmbeddingSourceType
  source_id: string
  content_text: string
  content_summary: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SimilaritySearchResult {
  id: string
  source_type: string
  source_id: string
  content_text: string
  content_summary: string | null
  metadata: Record<string, unknown>
  similarity: number
}

export interface UpsertEmbeddingParams {
  companyId: string
  sourceType: EmbeddingSourceType
  sourceId: string
  contentText: string
  contentSummary?: string
  metadata?: Record<string, unknown>
}

export interface SearchSimilarParams {
  companyId: string
  query: string
  threshold?: number
  limit?: number
  sourceType?: EmbeddingSourceType
}
