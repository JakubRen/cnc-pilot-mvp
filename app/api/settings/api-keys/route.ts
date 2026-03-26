import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { getUserProfile } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import type { ApiKey, CreateApiKeyResponse } from '@/lib/mcp/types'

/**
 * GET /api/settings/api-keys
 * List all API keys for the user's company. Never returns key_hash.
 */
export async function GET() {
  try {
    const user = await getUserProfile()
    if (!user?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, company_id, key_prefix, name, created_at, last_used_at, is_active')
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
    }

    return NextResponse.json({ keys: (data || []) as ApiKey[] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/settings/api-keys
 * Generate a new API key. Returns the full key ONCE.
 * Format: cncp_<32 hex chars> (40 chars total).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserProfile()
    if (!user?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owner/admin can create keys (RLS also enforces this)
    if (!user.role || !['owner', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const name = body.name?.trim()
    if (!name || name.length < 1 || name.length > 100) {
      return NextResponse.json({ error: 'Name is required (1-100 chars)' }, { status: 400 })
    }

    // Generate key: cncp_ + 32 hex chars
    const rawKey = `cncp_${randomBytes(16).toString('hex')}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 9) // "cncp_" + first 4 hex = 9 chars

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        company_id: user.company_id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name,
      })
      .select('id, key_prefix, name')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })
    }

    const response: CreateApiKeyResponse = {
      id: data.id,
      key: rawKey,
      key_prefix: data.key_prefix,
      name: data.name,
    }

    return NextResponse.json(response, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/settings/api-keys?id=<uuid>
 * Revoke (deactivate) an API key.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserProfile()
    if (!user?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.role || !['owner', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('company_id', user.company_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
