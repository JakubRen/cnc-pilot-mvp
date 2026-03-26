import { NextRequest, NextResponse } from 'next/server'
import { toJSONSchema } from 'zod'
import { validateApiKey } from '@/lib/api-auth'
import { toolRegistry, getToolByName } from '@/lib/mcp/tool-registry'
import {
  parseJsonRpcRequest,
  formatResponse,
  parseError,
  invalidRequest,
  methodNotFound,
  invalidParams,
  internalError,
} from '@/lib/mcp/json-rpc'
import type { McpServerInfo, McpToolListItem } from '@/lib/mcp/types'

/**
 * POST /api/mcp
 *
 * MCP endpoint implementing JSON-RPC 2.0.
 * Auth: Bearer token (API key) → SHA-256 hash → api_keys lookup → company_id.
 *
 * Methods:
 *   - "initialize"  → server info + capabilities
 *   - "tools/list"  → all tools with JSON Schema
 *   - "tools/call"  → execute a tool
 */
export async function POST(request: NextRequest) {
  // 1. Extract Bearer token
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json(
      invalidRequest(),
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
    )
  }

  // 2. Validate API key
  const validKey = await validateApiKey(token)
  if (!validKey) {
    return NextResponse.json(
      invalidRequest(),
      { status: 401 }
    )
  }

  // 3. Parse JSON body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(parseError())
  }

  // 4. Parse JSON-RPC request
  const rpcRequest = parseJsonRpcRequest(body)
  if (!rpcRequest) {
    return NextResponse.json(invalidRequest())
  }

  const { id, method, params } = rpcRequest

  // 5. Route to method handler
  try {
    switch (method) {
      case 'initialize': {
        const info: McpServerInfo = {
          name: 'cnc-pilot',
          version: '1.0.0',
          description: 'CNC-Pilot Express — AI Copilot tools for CNC workshop management',
          capabilities: { tools: true },
        }
        return NextResponse.json(formatResponse(id, info))
      }

      case 'tools/list': {
        const tools: McpToolListItem[] = toolRegistry.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: toJSONSchema(t.inputSchema) as Record<string, unknown>,
        }))
        return NextResponse.json(formatResponse(id, tools))
      }

      case 'tools/call': {
        const toolName = (params as Record<string, unknown>)?.name as string | undefined
        const toolArgs = (params as Record<string, unknown>)?.args ?? {}

        if (!toolName || typeof toolName !== 'string') {
          return NextResponse.json(invalidParams(id, 'Missing "name" in params'))
        }

        const toolDef = getToolByName(toolName)
        if (!toolDef) {
          return NextResponse.json(methodNotFound(id, `tools/call: ${toolName}`))
        }

        // Validate args against Zod schema
        const parseResult = toolDef.inputSchema.safeParse(toolArgs)
        if (!parseResult.success) {
          return NextResponse.json(
            invalidParams(id, parseResult.error?.message || 'Invalid arguments')
          )
        }

        const result = await toolDef.execute(validKey.companyId, parseResult.data as Record<string, unknown>)
        return NextResponse.json(formatResponse(id, result))
      }

      default:
        return NextResponse.json(methodNotFound(id, method))
    }
  } catch (error) {
    console.error(`[api/mcp] Error in ${method}:`, error)
    return NextResponse.json(internalError(id, 'Tool execution failed'))
  }
}
