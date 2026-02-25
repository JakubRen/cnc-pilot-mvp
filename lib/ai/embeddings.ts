'use server'

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import type {
  EmbeddingSourceType,
  UpsertEmbeddingParams,
  SearchSimilarParams,
  SimilaritySearchResult,
} from '@/types/copilot'

const EMBEDDING_MODEL = 'text-embedding-004'
const EMBEDDING_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// ============================================
// GENERATE EMBEDDING
// ============================================

/**
 * Generate embedding vector for a text using Google text-embedding-004.
 * Returns null if API key missing or error occurs.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    logger.warn('[embeddings] No GOOGLE_GENERATIVE_AI_API_KEY')
    return null
  }

  try {
    const response = await fetch(
      `${EMBEDDING_API_URL}/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
        }),
      }
    )

    if (!response.ok) {
      logger.error('[embeddings] API error', { status: response.status })
      return null
    }

    const data = await response.json()
    return data.embedding?.values || null
  } catch (err) {
    logger.error('[embeddings] generateEmbedding failed', { error: err })
    return null
  }
}

// ============================================
// UPSERT EMBEDDING
// ============================================

/**
 * Upsert an embedding for a source entity.
 * Deletes existing embedding for this source, then inserts new.
 */
export async function upsertEmbedding(params: UpsertEmbeddingParams): Promise<boolean> {
  const embedding = await generateEmbedding(params.contentText)
  if (!embedding) return false

  const supabase = await createClient()

  // Delete existing embedding for this source (upsert pattern)
  await supabase
    .from('knowledge_embeddings')
    .delete()
    .eq('company_id', params.companyId)
    .eq('source_type', params.sourceType)
    .eq('source_id', params.sourceId)

  const { error } = await supabase
    .from('knowledge_embeddings')
    .insert({
      company_id: params.companyId,
      source_type: params.sourceType,
      source_id: params.sourceId,
      content_text: params.contentText,
      content_summary: params.contentSummary || null,
      embedding: JSON.stringify(embedding),
      metadata: params.metadata || {},
    })

  if (error) {
    logger.error('[embeddings] upsertEmbedding failed', { error })
    return false
  }
  return true
}

// ============================================
// SIMILARITY SEARCH
// ============================================

/**
 * Search for similar documents using cosine similarity.
 * Uses the match_embeddings RPC function.
 */
export async function searchSimilar(params: SearchSimilarParams): Promise<SimilaritySearchResult[]> {
  const queryEmbedding = await generateEmbedding(params.query)
  if (!queryEmbedding) return []

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_company_id: params.companyId,
    match_threshold: params.threshold ?? 0.7,
    match_count: params.limit ?? 5,
    filter_source_type: params.sourceType ?? null,
  })

  if (error) {
    logger.error('[embeddings] searchSimilar failed', { error })
    return []
  }

  return data || []
}
