import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { ValidatedApiKey } from '@/lib/mcp/types'

/**
 * Validate an API key from the Authorization header.
 * Uses the service role client (bypasses RLS) because there is no user session.
 *
 * Flow: hash the raw key with SHA-256 → look up in api_keys → update last_used_at.
 */
export async function validateApiKey(rawKey: string): Promise<ValidatedApiKey | null> {
  if (!rawKey || !rawKey.startsWith('cncp_')) return null

  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, company_id, name')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  // Update last_used_at (fire-and-forget, don't block the response)
  supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return {
    companyId: data.company_id,
    keyId: data.id,
    keyName: data.name,
  }
}
