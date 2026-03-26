// =====================================================
// Tool Registry — Single Source of Truth
// =====================================================
// All 17 copilot tools defined once, consumed by:
//   1. app/api/ai/stream/route.ts  (AI Copilot chat)
//   2. app/api/mcp/route.ts        (MCP endpoint)

import { z } from 'zod'
import type { ToolDefinition } from './types'
import * as copilotTools from '@/lib/ai/copilot/tools'
import * as reportTools from '@/lib/ai/copilot/report-tools'

export const toolRegistry: ToolDefinition[] = [
  // ── Core Tools (1-6) ──────────────────────────────────
  {
    name: 'search_orders',
    description: 'Wyszukaj zamówienia po nazwie, statusie, kliencie lub dacie',
    inputSchema: z.object({
      query: z.string().optional().describe('Fraza wyszukiwania'),
      status: z.string().optional().describe('Status: pending, in_progress, completed, delayed, cancelled'),
      customer_name: z.string().optional().describe('Nazwa klienta'),
      date_from: z.string().optional().describe('Data od (YYYY-MM-DD)'),
      date_to: z.string().optional().describe('Data do (YYYY-MM-DD)'),
    }),
    execute: (companyId, params) => copilotTools.searchOrders(companyId, params),
  },
  {
    name: 'search_inventory',
    description: 'Wyszukaj produkty/materiały w magazynie po nazwie lub SKU',
    inputSchema: z.object({
      query: z.string().describe('Fraza wyszukiwania'),
      category: z.string().optional().describe('Kategoria: raw_material, finished_good, semi_finished, tool, consumable'),
    }),
    execute: (companyId, params) => copilotTools.searchInventory(companyId, params as { query: string; category?: string }),
  },
  {
    name: 'get_customer',
    description: 'Pobierz profil klienta z historią zamówień, CLV i ryzykiem odejścia',
    inputSchema: z.object({
      customer_name: z.string().describe('Nazwa klienta'),
    }),
    execute: (companyId, params) =>
      copilotTools.getCustomer(companyId, params.customer_name as string),
  },
  {
    name: 'check_deadlines',
    description: 'Sprawdź zagrożone terminy realizacji zamówień',
    inputSchema: z.object({
      days_ahead: z.number().optional().describe('Ile dni do przodu sprawdzić (domyślnie 7)'),
    }),
    execute: (companyId, params) =>
      copilotTools.checkDeadlines(companyId, params.days_ahead as number | undefined),
  },
  {
    name: 'generate_quote',
    description: 'Wygeneruj wycenę części CNC na podstawie materiału, złożoności i ilości',
    inputSchema: z.object({
      material: z.string().describe('Materiał (np. stal, aluminium, mosiądz)'),
      dimensions: z.string().optional().describe('Wymiary (np. 100x50x20mm)'),
      complexity: z.enum(['low', 'medium', 'high']).optional().describe('Złożoność'),
      quantity: z.number().optional().describe('Ilość sztuk'),
      additionalNotes: z.string().optional().describe('Dodatkowe uwagi'),
    }),
    execute: (_companyId, params) => copilotTools.generateQuote(params as Parameters<typeof copilotTools.generateQuote>[0]),
  },
  {
    name: 'get_production_plan',
    description: 'Wygeneruj plan produkcji (listę operacji) dla części CNC',
    inputSchema: z.object({
      partName: z.string().describe('Nazwa części'),
      material: z.string().describe('Materiał'),
      quantity: z.number().describe('Ilość'),
      complexity: z.enum(['simple', 'medium', 'complex']).describe('Złożoność'),
    }),
    execute: (companyId, params) => copilotTools.getProductionPlan(companyId, params as unknown as Parameters<typeof copilotTools.getProductionPlan>[1]),
  },

  // ── Background Agent Tools (7-12) ─────────────────────
  {
    name: 'run_demand_forecast',
    description: 'Prognozuj zapotrzebowanie na części i materiały na 30/60/90 dni. Użyj gdy user pyta o prognozy popytu, trendy zamówień.',
    inputSchema: z.object({
      days: z.number().optional().describe('Okres prognozy w dniach (30, 60, 90)'),
    }),
    execute: (companyId, params) => copilotTools.runDemandForecast(companyId, params),
  },
  {
    name: 'run_revenue_forecast',
    description: 'Prognozuj przychody i zyski na 30/60/90 dni. Użyj gdy user pyta o prognozy finansowe, przychody, marże.',
    inputSchema: z.object({
      days: z.number().optional().describe('Okres prognozy w dniach (30, 60, 90)'),
    }),
    execute: (companyId, params) => copilotTools.runRevenueForecast(companyId, params),
  },
  {
    name: 'check_auto_reorder',
    description: 'Sprawdź sugestie automatycznego zamówienia materiałów u dostawców. Użyj gdy user pyta o braki magazynowe, co zamówić.',
    inputSchema: z.object({}),
    execute: (companyId) => copilotTools.checkAutoReorder(companyId),
  },
  {
    name: 'run_dynamic_pricing',
    description: 'Zaproponuj dynamiczną cenę za część CNC uwzględniając popyt, historię i obciążenie. Użyj gdy user pyta ile wycenić część.',
    inputSchema: z.object({
      partName: z.string().describe('Nazwa części'),
      material: z.string().optional().describe('Materiał'),
      quantity: z.number().describe('Ilość sztuk'),
      complexity: z.string().optional().describe('Złożoność: simple, medium, complex'),
    }),
    execute: (companyId, params) => copilotTools.runDynamicPricing(companyId, params as Parameters<typeof copilotTools.runDynamicPricing>[1]),
  },
  {
    name: 'check_completion_risks',
    description: 'Sprawdź ryzyko opóźnień zamówień na podstawie postępu produkcji vs deadline. Użyj gdy user pyta o ryzyka, opóźnienia, które zamówienia są zagrożone.',
    inputSchema: z.object({
      days_ahead: z.number().optional().describe('Ile dni do przodu sprawdzić (domyślnie 7)'),
    }),
    execute: (companyId, params) => copilotTools.checkCompletionRisks(companyId, params),
  },
  {
    name: 'get_workshop_status',
    description: 'Kompleksowy status warsztatu: ryzyka opóźnień + braki magazynowe + alerty. Użyj gdy user pyta "jak idzie?", "co się dzieje?", "status warsztatu".',
    inputSchema: z.object({}),
    execute: (companyId) => copilotTools.getWorkshopStatus(companyId),
  },

  // ── PDF Tool (18) ──────────────────────────────────────
  {
    name: 'generate_quote_pdf',
    description: 'Wygeneruj PDF wyceny do pobrania. Użyj gdy user prosi o PDF/eksport wyceny.',
    inputSchema: z.object({
      quote_id: z.string().describe('ID wyceny do wygenerowania PDF'),
    }),
    execute: (companyId, params) => copilotTools.generateQuotePdf(companyId, params as { quote_id: string }),
  },

  // ── Report Tools (13-17) ──────────────────────────────
  {
    name: 'generate_orders_report',
    description: 'Generuj raport zamówień do CSV. Użyj gdy user prosi o eksport/raport/CSV zamówień.',
    inputSchema: z.object({
      status: z.string().optional().describe('Filtr statusu: pending, in_progress, completed, delayed, cancelled'),
      customer_name: z.string().optional().describe('Filtr klienta'),
      date_from: z.string().optional().describe('Data od (YYYY-MM-DD)'),
      date_to: z.string().optional().describe('Data do (YYYY-MM-DD)'),
    }),
    execute: (companyId, params) => reportTools.generateOrdersReport(companyId, params),
  },
  {
    name: 'generate_inventory_report',
    description: 'Generuj raport magazynu do CSV. Użyj gdy user prosi o eksport/raport stanów magazynowych.',
    inputSchema: z.object({
      category: z.string().optional().describe('Kategoria: raw_material, finished_good, semi_finished, tool, consumable'),
      low_stock_only: z.boolean().optional().describe('Tylko produkty z niskim stanem'),
    }),
    execute: (companyId, params) => reportTools.generateInventoryReport(companyId, params),
  },
  {
    name: 'generate_costs_report',
    description: 'Generuj raport kosztów i marż do CSV. Użyj gdy user prosi o eksport/raport kosztów/marż.',
    inputSchema: z.object({
      date_from: z.string().optional().describe('Data od (YYYY-MM-DD)'),
      date_to: z.string().optional().describe('Data do (YYYY-MM-DD)'),
    }),
    execute: (companyId, params) => reportTools.generateCostsReport(companyId, params),
  },
  {
    name: 'generate_customer_report',
    description: 'Generuj raport historii klienta do CSV. Użyj gdy user prosi o eksport/raport konkretnego klienta.',
    inputSchema: z.object({
      customer_name: z.string().describe('Nazwa klienta'),
    }),
    execute: (companyId, params) => reportTools.generateCustomerReport(companyId, params as { customer_name: string }),
  },
  {
    name: 'generate_deadlines_report',
    description: 'Generuj raport zagrożonych terminów do CSV. Użyj gdy user prosi o eksport/raport terminów/deadlines.',
    inputSchema: z.object({
      days_ahead: z.number().optional().describe('Ile dni do przodu (domyślnie 14)'),
    }),
    execute: (companyId, params) => reportTools.generateDeadlinesReport(companyId, params),
  },
]

/** Look up a tool by name */
export function getToolByName(name: string): ToolDefinition | undefined {
  return toolRegistry.find(t => t.name === name)
}
