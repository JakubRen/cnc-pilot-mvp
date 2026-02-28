import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { getUserProfile } from '@/lib/auth-server'
import { sanitizeUserInput, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import { searchSimilar } from '@/lib/ai/embeddings'
import { buildSystemPrompt } from '@/lib/ai/copilot/system-prompt'
import * as copilotTools from '@/lib/ai/copilot/tools'
import * as reportTools from '@/lib/ai/copilot/report-tools'
import { z } from 'zod'
import type { CopilotContext } from '@/types/copilot'

export const maxDuration = 30

// Extract text content from a UIMessage's parts
function getTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

export async function POST(request: Request) {
  try {
    const userProfile = await getUserProfile()
    if (!userProfile?.company_id) {
      return new Response('Unauthorized', { status: 401 })
    }
    const companyId = userProfile.company_id

    const body = await request.json()
    const uiMessages: UIMessage[] = body.messages ?? []
    const context: CopilotContext = body.context ?? {}

    // Get text from last user message for sanitization + RAG
    const lastUserMsg = [...uiMessages].reverse().find(m => m.role === 'user')
    const lastUserText = lastUserMsg ? getTextFromMessage(lastUserMsg) : ''

    // Sanitize
    let sanitizedText = lastUserText
    if (lastUserText) {
      const sanitized = sanitizeUserInput(lastUserText, {
        maxLength: FIELD_LIMITS.LONG,
        checkInjection: true,
      })
      sanitizedText = sanitized.text
    }

    // RAG: search for relevant context
    let ragContext = ''
    if (sanitizedText.length > 3) {
      const results = await searchSimilar({
        companyId,
        query: sanitizedText,
        threshold: 0.65,
        limit: 3,
      })
      if (results.length > 0) {
        ragContext = results
          .map(r => `[${r.source_type}] ${r.content_summary || r.content_text.slice(0, 200)}`)
          .join('\n')
      }
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return new Response('AI service not configured', { status: 503 })
    }

    const google = createGoogleGenerativeAI({ apiKey })

    // Convert UIMessages to ModelMessages for streamText
    const modelMessages = await convertToModelMessages(uiMessages)

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: buildSystemPrompt(context, ragContext),
      messages: modelMessages,
      tools: {
        search_orders: tool({
          description: 'Wyszukaj zamówienia po nazwie, statusie, kliencie lub dacie',
          inputSchema: z.object({
            query: z.string().optional().describe('Fraza wyszukiwania'),
            status: z.string().optional().describe('Status: pending, in_progress, completed, delayed, cancelled'),
            customer_name: z.string().optional().describe('Nazwa klienta'),
            date_from: z.string().optional().describe('Data od (YYYY-MM-DD)'),
            date_to: z.string().optional().describe('Data do (YYYY-MM-DD)'),
          }),
          execute: async (params) => copilotTools.searchOrders(companyId, params),
        }),
        search_inventory: tool({
          description: 'Wyszukaj produkty/materiały w magazynie po nazwie lub SKU',
          inputSchema: z.object({
            query: z.string().describe('Fraza wyszukiwania'),
            category: z.string().optional().describe('Kategoria: raw_material, finished_good, semi_finished, tool, consumable'),
          }),
          execute: async (params) => copilotTools.searchInventory(companyId, params),
        }),
        get_customer: tool({
          description: 'Pobierz profil klienta z historią zamówień, CLV i ryzykiem odejścia',
          inputSchema: z.object({
            customer_name: z.string().describe('Nazwa klienta'),
          }),
          execute: async ({ customer_name }) => copilotTools.getCustomer(companyId, customer_name),
        }),
        check_deadlines: tool({
          description: 'Sprawdź zagrożone terminy realizacji zamówień',
          inputSchema: z.object({
            days_ahead: z.number().optional().describe('Ile dni do przodu sprawdzić (domyślnie 7)'),
          }),
          execute: async ({ days_ahead }) => copilotTools.checkDeadlines(companyId, days_ahead),
        }),
        generate_quote: tool({
          description: 'Wygeneruj wycenę części CNC na podstawie materiału, złożoności i ilości',
          inputSchema: z.object({
            material: z.string().describe('Materiał (np. stal, aluminium, mosiądz)'),
            dimensions: z.string().optional().describe('Wymiary (np. 100x50x20mm)'),
            complexity: z.enum(['low', 'medium', 'high']).optional().describe('Złożoność'),
            quantity: z.number().optional().describe('Ilość sztuk'),
            additionalNotes: z.string().optional().describe('Dodatkowe uwagi'),
          }),
          execute: async (params) => copilotTools.generateQuote(params),
        }),
        get_production_plan: tool({
          description: 'Wygeneruj plan produkcji (listę operacji) dla części CNC',
          inputSchema: z.object({
            partName: z.string().describe('Nazwa części'),
            material: z.string().describe('Materiał'),
            quantity: z.number().describe('Ilość'),
            complexity: z.enum(['simple', 'medium', 'complex']).describe('Złożoność'),
          }),
          execute: async (params) => copilotTools.getProductionPlan(companyId, params),
        }),
        // Report tools (CSV export)
        generate_orders_report: tool({
          description: 'Generuj raport zamówień do CSV. Użyj gdy user prosi o eksport/raport/CSV zamówień.',
          inputSchema: z.object({
            status: z.string().optional().describe('Filtr statusu: pending, in_progress, completed, delayed, cancelled'),
            customer_name: z.string().optional().describe('Filtr klienta'),
            date_from: z.string().optional().describe('Data od (YYYY-MM-DD)'),
            date_to: z.string().optional().describe('Data do (YYYY-MM-DD)'),
          }),
          execute: async (params) => reportTools.generateOrdersReport(companyId, params),
        }),
        generate_inventory_report: tool({
          description: 'Generuj raport magazynu do CSV. Użyj gdy user prosi o eksport/raport stanów magazynowych.',
          inputSchema: z.object({
            category: z.string().optional().describe('Kategoria: raw_material, finished_good, semi_finished, tool, consumable'),
            low_stock_only: z.boolean().optional().describe('Tylko produkty z niskim stanem'),
          }),
          execute: async (params) => reportTools.generateInventoryReport(companyId, params),
        }),
        generate_costs_report: tool({
          description: 'Generuj raport kosztów i marż do CSV. Użyj gdy user prosi o eksport/raport kosztów/marż.',
          inputSchema: z.object({
            date_from: z.string().optional().describe('Data od (YYYY-MM-DD)'),
            date_to: z.string().optional().describe('Data do (YYYY-MM-DD)'),
          }),
          execute: async (params) => reportTools.generateCostsReport(companyId, params),
        }),
        generate_customer_report: tool({
          description: 'Generuj raport historii klienta do CSV. Użyj gdy user prosi o eksport/raport konkretnego klienta.',
          inputSchema: z.object({
            customer_name: z.string().describe('Nazwa klienta'),
          }),
          execute: async (params) => reportTools.generateCustomerReport(companyId, params),
        }),
        generate_deadlines_report: tool({
          description: 'Generuj raport zagrożonych terminów do CSV. Użyj gdy user prosi o eksport/raport terminów/deadlines.',
          inputSchema: z.object({
            days_ahead: z.number().optional().describe('Ile dni do przodu (domyślnie 14)'),
          }),
          execute: async (params) => reportTools.generateDeadlinesReport(companyId, params),
        }),
      },
      stopWhen: stepCountIs(5),
      temperature: 0.3,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[ai/stream] Unexpected error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
