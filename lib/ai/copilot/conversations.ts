'use server'

import { createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import type { ConversationMetadata, ConversationRow } from '@/types/copilot'

// ============================================
// SAVE CONVERSATION
// ============================================

export async function saveConversation(params: {
  companyId: string
  userId: number
  conversationId?: string
  messages: Array<{ role: string; content: string; createdAt?: string }>
  context?: Record<string, unknown>
  title?: string
}): Promise<string | null> {
  const supabase = await createClient()

  if (params.conversationId) {
    // Update existing
    const { error } = await supabase
      .from('ai_conversations')
      .update({
        messages: params.messages,
        message_count: params.messages.length,
        title: params.title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.conversationId)

    if (error) {
      logger.error('[copilot/conversations] update error', { error })
      return null
    }
    return params.conversationId
  } else {
    // Create new
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        company_id: params.companyId,
        user_id: params.userId,
        messages: params.messages,
        message_count: params.messages.length,
        context: params.context || {},
        title: params.title || null,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('[copilot/conversations] insert error', { error })
      return null
    }
    return data?.id || null
  }
}

// ============================================
// GET CONVERSATION HISTORY
// ============================================

export async function getConversationHistory(
  userId: number,
  limit: number = 20
): Promise<ConversationMetadata[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, company_id, user_id, title, message_count, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('[copilot/conversations] getHistory error', { error })
    return []
  }
  return (data || []) as ConversationMetadata[]
}

// ============================================
// GET SINGLE CONVERSATION
// ============================================

export async function getConversation(conversationId: string): Promise<ConversationRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (error) {
    logger.error('[copilot/conversations] getConversation error', { error })
    return null
  }
  return data as ConversationRow
}
