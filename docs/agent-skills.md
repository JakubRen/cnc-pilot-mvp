# CNC-Pilot Express — MCP Agent Skills

## Overview

CNC-Pilot Express exposes 18 AI tools via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), enabling external AI clients (Claude Desktop, Cursor, custom agents) to interact with your CNC workshop data.

Tools cover: order management, inventory, customer intelligence, pricing, production planning, demand/revenue forecasting, risk monitoring, PDF generation, and Excel reporting.

## Authentication

All MCP requests require a Bearer token (API key).

1. Go to **Settings > API Keys** in CNC-Pilot Express
2. Click **Generate New Key** and name it (e.g., "Claude Desktop")
3. Copy the key (shown once): `cncp_<32 hex chars>`
4. Use it as `Authorization: Bearer cncp_...` in all requests

Keys are SHA-256 hashed before storage. The raw key is never retrievable after creation.

## Connection Guide

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cnc-pilot": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer cncp_your_api_key_here"
      }
    }
  }
}
```

### Cursor

In Cursor Settings > MCP, add a new server:
- **Name:** cnc-pilot
- **URL:** `https://your-domain.com/api/mcp`
- **Headers:** `Authorization: Bearer cncp_your_api_key_here`

### curl (Testing)

```bash
# Initialize
curl -X POST https://your-domain.com/api/mcp \
  -H "Authorization: Bearer cncp_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize"}'

# List tools
curl -X POST https://your-domain.com/api/mcp \
  -H "Authorization: Bearer cncp_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}'

# Call a tool
curl -X POST https://your-domain.com/api/mcp \
  -H "Authorization: Bearer cncp_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_workshop_status", "args": {}}}'
```

## JSON-RPC 2.0 Protocol

**Endpoint:** `POST /api/mcp`

**Methods:**
| Method | Description |
|--------|-------------|
| `initialize` | Returns server info and capabilities |
| `tools/list` | Returns all 18 tools with JSON Schema definitions |
| `tools/call` | Execute a tool: `{ name: string, args: object }` |

---

## Tools Reference

### 1. get_workshop_status

**PL:** Kompleksowy status warsztatu: ryzyka opoznienia + braki magazynowe + alerty.
**EN:** Comprehensive workshop status: completion risks + low stock alerts + summary.

**Parameters:** None

**Returns:** `{ type, completion_risks, auto_reorder_items, alerts[], overall_status: 'ok'|'warning'|'critical' }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_workshop_status", "args": {}}}
```

---

### 2. search_orders

**PL:** Wyszukaj zamowienia po nazwie, statusie, kliencie lub dacie.
**EN:** Search orders by name, status, customer, or date.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | No | Search phrase (matches part_name, customer_name, order_number) |
| status | string | No | Filter: pending, in_progress, completed, delayed, cancelled |
| customer_name | string | No | Customer name filter |
| date_from | string | No | Start date (YYYY-MM-DD) |
| date_to | string | No | End date (YYYY-MM-DD) |

**Returns:** Array of order objects `{ id, order_number, customer_name, part_name, material, quantity, status, deadline, selling_price, created_at }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "search_orders", "args": {"status": "in_progress", "customer_name": "Kowalski"}}}
```

---

### 3. check_deadlines

**PL:** Sprawdz zagrozone terminy realizacji zamowien.
**EN:** Check at-risk order deadlines with completion likelihood analysis.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| days_ahead | number | No | Days to look ahead (default: 7) |

**Returns:** Array of orders with `{ orderNumber, customerName, deadline, daysRemaining, completionLikelihood, risk, productionProgress, statusSummary }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "check_deadlines", "args": {"days_ahead": 14}}}
```

---

### 4. check_completion_risks

**PL:** Sprawdz ryzyko opoznien zamowien na podstawie postepu produkcji vs deadline.
**EN:** Analyze completion risks: production progress vs. deadline.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| days_ahead | number | No | Days to look ahead (default: 7) |

**Returns:** `{ orders[], critical_count, at_risk_count }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "check_completion_risks", "args": {"days_ahead": 7}}}
```

---

### 5. search_inventory

**PL:** Wyszukaj produkty/materialy w magazynie po nazwie lub SKU.
**EN:** Search inventory products/materials by name or SKU.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | Search phrase |
| category | string | No | Filter: raw_material, finished_good, semi_finished, tool, consumable |

**Returns:** Array of `{ id, name, sku, category, unit, description, available_quantity }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "search_inventory", "args": {"query": "aluminium"}}}
```

---

### 6. generate_quote

**PL:** Wygeneruj wycene czesci CNC na podstawie materialu, zlozonosci i ilosci.
**EN:** Generate a CNC part quote based on material, complexity, and quantity.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| material | string | Yes | Material (e.g., stal, aluminium, mosiadz) |
| dimensions | string | No | Dimensions (e.g., 100x50x20mm) |
| complexity | string | No | low, medium, or high |
| quantity | number | No | Number of units |
| additionalNotes | string | No | Extra notes |

**Returns:** Price estimate with breakdown `{ totalPrice, pricePerUnit, breakdown: { materialCost, laborCost, setupCost, marginPercentage } }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_quote", "args": {"material": "aluminium", "quantity": 50, "complexity": "medium"}}}
```

---

### 7. get_customer

**PL:** Pobierz profil klienta z historia zamowien, CLV i ryzykiem odejscia.
**EN:** Get customer profile with order history, CLV, and churn risk.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| customer_name | string | Yes | Customer name |

**Returns:** `{ name, profile: { orderCount, totalRevenue, lastOrderDate, churnScore }, buyingPatterns, aiAnalysis }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_customer", "args": {"customer_name": "Firma Kowalski"}}}
```

---

### 8. get_production_plan

**PL:** Wygeneruj plan produkcji (liste operacji) dla czesci CNC.
**EN:** Generate a production plan (operation list) for a CNC part.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| partName | string | Yes | Part name |
| material | string | Yes | Material |
| quantity | number | Yes | Quantity |
| complexity | string | Yes | simple, medium, or complex |

**Returns:** Generated production plan with operations, estimated times, and costs.

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_production_plan", "args": {"partName": "Tuleja 50mm", "material": "stal", "quantity": 100, "complexity": "medium"}}}
```

---

### 9. run_demand_forecast

**PL:** Prognozuj zapotrzebowanie na czesci i materialy na 30/60/90 dni.
**EN:** Forecast demand for parts and materials over 30/60/90 days.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| days | number | No | Forecast period in days (default: 30) |

**Returns:** Demand forecast with trending parts, material needs, and seasonal patterns.

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "run_demand_forecast", "args": {"days": 60}}}
```

---

### 10. run_revenue_forecast

**PL:** Prognozuj przychody i zyski na 30/60/90 dni.
**EN:** Forecast revenue and profits for the next 30/60/90 days.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| days | number | No | Forecast period in days (default: 30) |

**Returns:** Revenue projection with monthly breakdown, margin estimates, and trends.

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "run_revenue_forecast", "args": {"days": 90}}}
```

---

### 11. check_auto_reorder

**PL:** Sprawdz sugestie automatycznego zamowienia materialow u dostawcow.
**EN:** Check auto-reorder suggestions for low-stock materials.

**Parameters:** None

**Returns:** List of materials that need reordering with suggested quantities and suppliers.

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "check_auto_reorder", "args": {}}}
```

---

### 12. run_dynamic_pricing

**PL:** Zaproponuj dynamiczna cene za czesc CNC uwzgledniajac popyt, historie i obciazenie.
**EN:** Suggest dynamic pricing for a CNC part based on demand, history, and workload.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| partName | string | Yes | Part name |
| material | string | No | Material |
| quantity | number | Yes | Number of units |
| complexity | string | No | simple, medium, or complex |

**Returns:** Price suggestion with confidence, reasoning, and comparison to historical prices.

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "run_dynamic_pricing", "args": {"partName": "Wrzeciono", "quantity": 20, "complexity": "complex"}}}
```

---

### 13. generate_quote_pdf

**PL:** Wygeneruj PDF wyceny do pobrania.
**EN:** Generate a downloadable quote PDF.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| quote_id | string | Yes | Quote UUID to generate PDF for |

**Returns:** `{ url: '/api/ai/reports/{fileId}', fileName: 'Wycena_QT-2025-0001_Klient.pdf' }`

The URL is valid for 1 hour. Download via GET request with the same session.

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_quote_pdf", "args": {"quote_id": "550e8400-e29b-41d4-a716-446655440000"}}}
```

---

### 14. generate_orders_report

**PL:** Generuj raport zamowien do Excel (XLSX).
**EN:** Generate an orders report as downloadable Excel file.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | No | Filter: pending, in_progress, completed, delayed, cancelled |
| customer_name | string | No | Customer name filter |
| date_from | string | No | Start date (YYYY-MM-DD) |
| date_to | string | No | End date (YYYY-MM-DD) |

**Returns:** `{ type: 'report', reportName, rowCount, summary, csvUrl: '/api/ai/reports/{id}', reportPageUrl }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_orders_report", "args": {"status": "completed", "date_from": "2025-01-01"}}}
```

---

### 15. generate_inventory_report

**PL:** Generuj raport magazynu do Excel.
**EN:** Generate an inventory report as downloadable Excel file.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | No | Filter: raw_material, finished_good, semi_finished, tool, consumable |
| low_stock_only | boolean | No | Only show low-stock items |

**Returns:** `{ type: 'report', reportName, rowCount, summary, csvUrl, reportPageUrl }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_inventory_report", "args": {"low_stock_only": true}}}
```

---

### 16. generate_costs_report

**PL:** Generuj raport kosztow i marz do Excel.
**EN:** Generate a costs and margins report as downloadable Excel file.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| date_from | string | No | Start date (YYYY-MM-DD) |
| date_to | string | No | End date (YYYY-MM-DD) |

**Returns:** `{ type: 'report', reportName, rowCount, summary, csvUrl, reportPageUrl }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_costs_report", "args": {"date_from": "2025-01-01", "date_to": "2025-03-31"}}}
```

---

### 17. generate_customer_report

**PL:** Generuj raport historii klienta do Excel.
**EN:** Generate a customer history report as downloadable Excel file.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| customer_name | string | Yes | Customer name |

**Returns:** `{ type: 'report', reportName, rowCount, summary, csvUrl, reportPageUrl }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_customer_report", "args": {"customer_name": "Firma Kowalski"}}}
```

---

### 18. generate_deadlines_report

**PL:** Generuj raport zagrozonych terminow do Excel.
**EN:** Generate an at-risk deadlines report as downloadable Excel file.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| days_ahead | number | No | Days to look ahead (default: 14) |

**Returns:** `{ type: 'report', reportName, rowCount, summary, csvUrl, reportPageUrl }`

**Example:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "generate_deadlines_report", "args": {"days_ahead": 30}}}
```

---

## Error Codes

Standard JSON-RPC 2.0 error codes:

| Code | Meaning |
|------|---------|
| -32700 | Parse error (malformed JSON) |
| -32600 | Invalid request (missing jsonrpc/id/method) |
| -32601 | Method not found |
| -32602 | Invalid params (Zod validation failed) |
| -32603 | Internal error (tool execution failed) |

HTTP status 401 is returned for missing or invalid API keys.
