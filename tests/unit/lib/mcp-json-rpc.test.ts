import { describe, it, expect } from 'vitest'
import {
  parseJsonRpcRequest,
  formatResponse,
  formatError,
  parseError,
  invalidRequest,
  methodNotFound,
  invalidParams,
  internalError,
} from '@/lib/mcp/json-rpc'
import { JSON_RPC_ERRORS } from '@/lib/mcp/types'

// ============================================
// parseJsonRpcRequest
// ============================================
describe('parseJsonRpcRequest', () => {
  it('should parse a valid JSON-RPC request', () => {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: { foo: 'bar' },
    }

    const result = parseJsonRpcRequest(body)
    expect(result).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: { foo: 'bar' },
    })
  })

  it('should parse a request with string id', () => {
    const body = {
      jsonrpc: '2.0',
      id: 'req-42',
      method: 'initialize',
    }

    const result = parseJsonRpcRequest(body)
    expect(result).toEqual({
      jsonrpc: '2.0',
      id: 'req-42',
      method: 'initialize',
      params: undefined,
    })
  })

  it('should return null for null body', () => {
    expect(parseJsonRpcRequest(null)).toBeNull()
  })

  it('should return null for undefined body', () => {
    expect(parseJsonRpcRequest(undefined)).toBeNull()
  })

  it('should return null for non-object body (string)', () => {
    expect(parseJsonRpcRequest('not an object')).toBeNull()
  })

  it('should return null for non-object body (number)', () => {
    expect(parseJsonRpcRequest(42)).toBeNull()
  })

  it('should return null if jsonrpc is not "2.0"', () => {
    const body = { jsonrpc: '1.0', id: 1, method: 'test' }
    expect(parseJsonRpcRequest(body)).toBeNull()
  })

  it('should return null if jsonrpc is missing', () => {
    const body = { id: 1, method: 'test' }
    expect(parseJsonRpcRequest(body)).toBeNull()
  })

  it('should return null if method is missing', () => {
    const body = { jsonrpc: '2.0', id: 1 }
    expect(parseJsonRpcRequest(body)).toBeNull()
  })

  it('should return null if method is not a string', () => {
    const body = { jsonrpc: '2.0', id: 1, method: 42 }
    expect(parseJsonRpcRequest(body)).toBeNull()
  })

  it('should return null if id is null', () => {
    const body = { jsonrpc: '2.0', id: null, method: 'test' }
    expect(parseJsonRpcRequest(body)).toBeNull()
  })

  it('should return null if id is undefined (missing)', () => {
    const body = { jsonrpc: '2.0', method: 'test' }
    expect(parseJsonRpcRequest(body)).toBeNull()
  })

  it('should accept id=0 as valid', () => {
    const body = { jsonrpc: '2.0', id: 0, method: 'test' }
    const result = parseJsonRpcRequest(body)
    expect(result).not.toBeNull()
    expect(result!.id).toBe(0)
  })

  it('should default params to undefined when not provided', () => {
    const body = { jsonrpc: '2.0', id: 1, method: 'test' }
    const result = parseJsonRpcRequest(body)
    expect(result!.params).toBeUndefined()
  })
})

// ============================================
// formatResponse
// ============================================
describe('formatResponse', () => {
  it('should format a success response with correct structure', () => {
    const result = formatResponse(1, { tools: ['a', 'b'] })
    expect(result).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { tools: ['a', 'b'] },
    })
  })

  it('should handle string id', () => {
    const result = formatResponse('req-42', 'ok')
    expect(result.id).toBe('req-42')
    expect(result.result).toBe('ok')
  })

  it('should handle null result', () => {
    const result = formatResponse(1, null)
    expect(result.result).toBeNull()
  })

  it('should not include error field', () => {
    const result = formatResponse(1, 'data')
    expect(result.error).toBeUndefined()
  })
})

// ============================================
// formatError
// ============================================
describe('formatError', () => {
  it('should format an error response with correct structure', () => {
    const result = formatError(1, -32600, 'Invalid request')
    expect(result).toEqual({
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32600,
        message: 'Invalid request',
      },
    })
  })

  it('should include data field when provided', () => {
    const result = formatError(1, -32602, 'Bad params', { field: 'name' })
    expect(result.error!.data).toEqual({ field: 'name' })
  })

  it('should not include data field when undefined', () => {
    const result = formatError(1, -32600, 'Error')
    expect(result.error).not.toHaveProperty('data')
  })

  it('should use 0 as id when null is passed', () => {
    const result = formatError(null, -32700, 'Parse error')
    expect(result.id).toBe(0)
  })
})

// ============================================
// Pre-built error helpers
// ============================================
describe('error helpers', () => {
  describe('parseError', () => {
    it('should use PARSE_ERROR code (-32700)', () => {
      const result = parseError(1)
      expect(result.error!.code).toBe(JSON_RPC_ERRORS.PARSE_ERROR)
      expect(result.error!.code).toBe(-32700)
      expect(result.error!.message).toBe('Parse error')
    })

    it('should default id to 0 when not provided', () => {
      const result = parseError()
      expect(result.id).toBe(0)
    })
  })

  describe('invalidRequest', () => {
    it('should use INVALID_REQUEST code (-32600)', () => {
      const result = invalidRequest(5)
      expect(result.error!.code).toBe(JSON_RPC_ERRORS.INVALID_REQUEST)
      expect(result.error!.code).toBe(-32600)
      expect(result.error!.message).toBe('Invalid request')
    })
  })

  describe('methodNotFound', () => {
    it('should use METHOD_NOT_FOUND code (-32601) and include method name', () => {
      const result = methodNotFound(1, 'unknown/method')
      expect(result.error!.code).toBe(JSON_RPC_ERRORS.METHOD_NOT_FOUND)
      expect(result.error!.code).toBe(-32601)
      expect(result.error!.message).toContain('unknown/method')
    })
  })

  describe('invalidParams', () => {
    it('should use INVALID_PARAMS code (-32602) and include detail', () => {
      const result = invalidParams(1, 'Missing "name"')
      expect(result.error!.code).toBe(JSON_RPC_ERRORS.INVALID_PARAMS)
      expect(result.error!.code).toBe(-32602)
      expect(result.error!.message).toContain('Missing "name"')
    })
  })

  describe('internalError', () => {
    it('should use INTERNAL_ERROR code (-32603)', () => {
      const result = internalError(1, 'Tool execution failed')
      expect(result.error!.code).toBe(JSON_RPC_ERRORS.INTERNAL_ERROR)
      expect(result.error!.code).toBe(-32603)
      expect(result.error!.message).toContain('Tool execution failed')
    })

    it('should use default message when detail not provided', () => {
      const result = internalError(1)
      expect(result.error!.message).toBe('Internal error')
    })
  })
})

// ============================================
// JSON_RPC_ERRORS constants
// ============================================
describe('JSON_RPC_ERRORS', () => {
  it('should have standard error codes', () => {
    expect(JSON_RPC_ERRORS.PARSE_ERROR).toBe(-32700)
    expect(JSON_RPC_ERRORS.INVALID_REQUEST).toBe(-32600)
    expect(JSON_RPC_ERRORS.METHOD_NOT_FOUND).toBe(-32601)
    expect(JSON_RPC_ERRORS.INVALID_PARAMS).toBe(-32602)
    expect(JSON_RPC_ERRORS.INTERNAL_ERROR).toBe(-32603)
  })
})
