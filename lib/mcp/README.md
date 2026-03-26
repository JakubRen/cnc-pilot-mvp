# MCP Server — Architecture

## Overview

CNC-Pilot Express exposes its AI Copilot tools via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), allowing external AI clients (Claude Desktop, Cursor, custom agents) to call the same tools that the built-in chat uses.

## Tool Registry Pattern

### Problem

Today, all 17 tools are defined **inline** in `app/api/ai/stream/route.ts` — each one combining a Zod schema, a description, and an execute function via the Vercel AI SDK `tool()` wrapper. This means:

- Tools can't be reused by the MCP endpoint without duplicating definitions
- Adding a new tool requires editing the monolithic route file
- There's no single source of truth for "what tools exist"

### Solution: Shared Registry

Extract tool definitions into a single registry array that both consumers import:

```
lib/mcp/tool-registry.ts        ← single source of truth
  ├── used by: app/api/ai/stream/route.ts    (AI Copilot chat)
  └── used by: app/api/mcp/route.ts          (MCP endpoint)
```

#### Registry File Structure

```typescript
// lib/mcp/tool-registry.ts
import { z } from 'zod'
import type { ToolDefinition } from './types'
import * as copilotTools from '@/lib/ai/copilot/tools'
import * as reportTools from '@/lib/ai/copilot/report-tools'

export const toolRegistry: ToolDefinition[] = [
  {
    name: 'search_orders',
    description: 'Wyszukaj zamówienia po nazwie, statusie, kliencie lub dacie',
    inputSchema: z.object({
      query: z.string().optional(),
      status: z.string().optional(),
      customer_name: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
    }),
    execute: (companyId, params) => copilotTools.searchOrders(companyId, params),
  },
  // ... all 17 tools
]
```

#### Consumer: AI Stream Route

```typescript
// app/api/ai/stream/route.ts (refactored)
import { tool } from 'ai'
import { toolRegistry } from '@/lib/mcp/tool-registry'

// Convert registry to Vercel AI SDK format
const tools = Object.fromEntries(
  toolRegistry.map(t => [
    t.name,
    tool({
      description: t.description,
      inputSchema: t.inputSchema,
      execute: async (params) => t.execute(companyId, params),
    }),
  ])
)
```

#### Consumer: MCP Endpoint

```typescript
// app/api/mcp/route.ts
import { toolRegistry } from '@/lib/mcp/tool-registry'

// tools/list — convert Zod schemas to JSON Schema via Zod 4 native method
function handleToolsList() {
  return toolRegistry.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema.toJSONSchema(),
  }))
}

// tools/call — find tool, validate params, execute
async function handleToolCall(companyId: string, name: string, args: unknown) {
  const def = toolRegistry.find(t => t.name === name)
  if (!def) throw methodNotFound(name)

  const parsed = def.inputSchema.parse(args)
  return def.execute(companyId, parsed)
}
```

### Zod 4 `.toJSONSchema()`

The project uses Zod 4 (`^4.1.12`), which has **native JSON Schema conversion**:

```typescript
import { z } from 'zod'

const schema = z.object({ query: z.string().optional() })
const jsonSchema = schema.toJSONSchema()
// → { type: "object", properties: { query: { type: "string" } } }
```

No extra packages needed. This is used in the MCP `tools/list` response to expose tool schemas in JSON Schema format (as required by the MCP spec).

## All 17 Tools

| # | Tool Name | Source | Needs companyId |
|---|-----------|--------|-----------------|
| 1 | search_orders | copilotTools | yes |
| 2 | search_inventory | copilotTools | yes |
| 3 | get_customer | copilotTools | yes |
| 4 | check_deadlines | copilotTools | yes |
| 5 | generate_quote | copilotTools | no* |
| 6 | get_production_plan | copilotTools | yes |
| 7 | run_demand_forecast | copilotTools | yes |
| 8 | run_revenue_forecast | copilotTools | yes |
| 9 | check_auto_reorder | copilotTools | yes |
| 10 | run_dynamic_pricing | copilotTools | yes |
| 11 | check_completion_risks | copilotTools | yes |
| 12 | get_workshop_status | copilotTools | yes |
| 13 | generate_orders_report | reportTools | yes |
| 14 | generate_inventory_report | reportTools | yes |
| 15 | generate_costs_report | reportTools | yes |
| 16 | generate_customer_report | reportTools | yes |
| 17 | generate_deadlines_report | reportTools | yes |

*`generate_quote` currently doesn't use companyId — the registry normalizes all executors to `(companyId, params)` for consistency; it simply ignores companyId internally.

## MCP API Route

**Endpoint**: `POST /api/mcp`

**Auth**: Bearer token → SHA-256 hash → lookup in `api_keys` table → extract `company_id`

### Supported Methods

| Method | Description |
|--------|-------------|
| `initialize` | Returns server info + capabilities |
| `tools/list` | Returns all 17 tools with JSON Schema |
| `tools/call` | Validates params, executes tool, returns result |

### Request/Response Flow

```
Client                          Server
  │                               │
  │  POST /api/mcp                │
  │  Authorization: Bearer cncp_  │
  │  { jsonrpc: "2.0",           │
  │    method: "tools/call",     │
  │    params: { name, args } }  │
  │ ─────────────────────────►   │
  │                               │ 1. Hash Bearer token
  │                               │ 2. SELECT from api_keys WHERE key_hash = ?
  │                               │ 3. Get company_id
  │                               │ 4. Find tool in registry
  │                               │ 5. Zod-validate args
  │                               │ 6. Execute tool(companyId, args)
  │                               │
  │  { jsonrpc: "2.0",           │
  │    result: { ... } }         │
  │ ◄─────────────────────────   │
```

## API Key Security

- Keys follow format: `cncp_<32 random hex chars>` (40 chars total)
- Only the SHA-256 hash is stored in DB (`key_hash` column)
- The raw key is shown **once** on creation, never retrievable again
- `key_prefix` (first 8 chars) is stored for display in settings UI
- `last_used_at` is updated on each MCP request (rate limit friendly — batch update)
- Keys can be deactivated (`is_active = false`) without deletion

## Database

Table `api_keys` — see `migrations/add_api_keys.sql`:
- RLS enabled: all company members can view (masked), only owner/admin can create/update/delete
- Indexes on `key_hash` (auth lookup) and `company_id` (settings list)

## Configuration for Claude Desktop

```json
{
  "mcpServers": {
    "cnc-pilot": {
      "url": "https://app.cncpilot.com/api/mcp",
      "headers": {
        "Authorization": "Bearer cncp_your_api_key_here"
      }
    }
  }
}
```
