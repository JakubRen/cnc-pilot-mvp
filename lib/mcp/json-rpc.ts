import type { JsonRpcRequest, JsonRpcResponse } from './types'
import { JSON_RPC_ERRORS } from './types'

/**
 * Parse and validate a JSON-RPC 2.0 request from the raw body.
 * Returns null if the body is not a valid JSON-RPC request.
 */
export function parseJsonRpcRequest(body: unknown): JsonRpcRequest | null {
  if (!body || typeof body !== 'object') return null

  const obj = body as Record<string, unknown>

  if (obj.jsonrpc !== '2.0') return null
  if (typeof obj.method !== 'string') return null
  if (obj.id === undefined || obj.id === null) return null

  return {
    jsonrpc: '2.0',
    id: obj.id as string | number,
    method: obj.method,
    params: (obj.params as Record<string, unknown>) ?? undefined,
  }
}

/**
 * Format a successful JSON-RPC 2.0 response.
 */
export function formatResponse(id: string | number, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  }
}

/**
 * Format a JSON-RPC 2.0 error response.
 */
export function formatError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? 0,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  }
}

// Pre-built error helpers
export function parseError(id?: string | number | null) {
  return formatError(id ?? null, JSON_RPC_ERRORS.PARSE_ERROR, 'Parse error')
}

export function invalidRequest(id?: string | number | null) {
  return formatError(id ?? null, JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid request')
}

export function methodNotFound(id: string | number, method: string) {
  return formatError(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${method}`)
}

export function invalidParams(id: string | number, detail: string) {
  return formatError(id, JSON_RPC_ERRORS.INVALID_PARAMS, `Invalid params: ${detail}`)
}

export function internalError(id: string | number, detail?: string) {
  return formatError(id, JSON_RPC_ERRORS.INTERNAL_ERROR, detail || 'Internal error')
}
