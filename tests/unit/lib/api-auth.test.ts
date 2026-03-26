import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'

// ============================================
// Mock supabaseAdmin (service role client)
// Use vi.hoisted() to avoid hoisting issues with vi.mock factory
// ============================================
const { mockSingle, mockEqChain, mockEq, mockSelect, mockUpdate, mockUpdateEq, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEqChain = vi.fn(() => ({ single: mockSingle }))
  const mockEq = vi.fn(() => ({ eq: mockEqChain }))
  const mockSelect = vi.fn(() => ({ eq: mockEq }))
  // The update chain ends with .eq('id', ...).then(() => {})
  // So the final .eq must return a thenable (Promise-like)
  const mockUpdateEq = vi.fn(() => Promise.resolve({}))
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
  const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))
  return { mockSingle, mockEqChain, mockEq, mockSelect, mockUpdate, mockUpdateEq, mockFrom }
})

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}))

import { validateApiKey } from '@/lib/api-auth'

// ============================================
// validateApiKey
// ============================================
describe('validateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return ValidatedApiKey for a valid active key', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'key-uuid-123',
        company_id: 'company-uuid-456',
        name: 'Production Key',
      },
      error: null,
    })

    const result = await validateApiKey('cncp_abc123def456')

    expect(result).toEqual({
      companyId: 'company-uuid-456',
      keyId: 'key-uuid-123',
      keyName: 'Production Key',
    })

    // Verify SHA-256 hash was used for lookup
    const expectedHash = createHash('sha256').update('cncp_abc123def456').digest('hex')
    expect(mockFrom).toHaveBeenCalledWith('api_keys')
    expect(mockSelect).toHaveBeenCalledWith('id, company_id, name')
    expect(mockEq).toHaveBeenCalledWith('key_hash', expectedHash)
    expect(mockEqChain).toHaveBeenCalledWith('is_active', true)
  })

  it('should return null for an invalid key (not found in DB)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    const result = await validateApiKey('cncp_invalidkey999')
    expect(result).toBeNull()
  })

  it('should return null for an inactive key', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'No rows' },
    })

    const result = await validateApiKey('cncp_inactivekey123')
    expect(result).toBeNull()
  })

  it('should return null for an empty string', async () => {
    const result = await validateApiKey('')
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('should return null for a key without cncp_ prefix', async () => {
    const result = await validateApiKey('sk_abc123def456')
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('should return null for a malformed key (just "cncp_")', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    const result = await validateApiKey('cncp_')
    expect(result).toBeNull()
  })

  it('should update last_used_at after successful validation (fire-and-forget)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'key-uuid-789',
        company_id: 'company-uuid-101',
        name: 'Dev Key',
      },
      error: null,
    })

    await validateApiKey('cncp_validkey789')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ last_used_at: expect.any(String) })
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'key-uuid-789')
  })

  it('should use SHA-256 to hash the key', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null })

    const testKey = 'cncp_test1234567890abcdef'
    await validateApiKey(testKey)

    const expectedHash = createHash('sha256').update(testKey).digest('hex')
    expect(mockEq).toHaveBeenCalledWith('key_hash', expectedHash)
  })
})
