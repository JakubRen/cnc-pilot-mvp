// =====================================================
// MCP Server — TypeScript Types
// =====================================================

import type { ZodType } from 'zod'

// -----------------------------------------------------
// Tool Registry
// -----------------------------------------------------

/**
 * A single tool in the shared registry.
 * Used by both the AI stream route and the MCP endpoint.
 *
 * `inputSchema` is a Zod 4 schema — the stream route passes it
 * directly to `tool()`, while the MCP route calls
 * `inputSchema.toJSONSchema()` for the tools/list response.
 */
export interface ToolDefinition {
  name: string
  description: string
  inputSchema: ZodType
  execute: (companyId: string, params: Record<string, unknown>) => Promise<unknown>
}

// -----------------------------------------------------
// JSON-RPC 2.0 (MCP transport)
// -----------------------------------------------------

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

// Standard JSON-RPC error codes
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

// -----------------------------------------------------
// API Key Management
// -----------------------------------------------------

/** Row from `api_keys` table (never includes key_hash) */
export interface ApiKey {
  id: string
  company_id: string
  key_prefix: string   // first 8 chars, e.g. "cncp_a1b2"
  name: string         // user-defined label
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

/** Result of validating a Bearer token against api_keys */
export interface ValidatedApiKey {
  companyId: string
  keyId: string
  keyName: string
}

/** Form data for creating a new API key */
export interface CreateApiKeyInput {
  name: string
}

/** Response after creating a key (only time the raw key is visible) */
export interface CreateApiKeyResponse {
  id: string
  key: string          // full key, shown once: "cncp_<random>"
  key_prefix: string
  name: string
}

// -----------------------------------------------------
// MCP Server Info (initialize response)
// -----------------------------------------------------

export interface McpServerInfo {
  name: string
  version: string
  description: string
  capabilities: {
    tools: boolean
  }
}

// -----------------------------------------------------
// MCP Protocol Messages
// -----------------------------------------------------

/** tools/list response item (JSON Schema, not Zod) */
export interface McpToolListItem {
  name: string
  description: string
  inputSchema: Record<string, unknown>  // JSON Schema from Zod 4 .toJSONSchema()
}
