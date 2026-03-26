import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { getUserProfile } from '@/lib/auth-server'
import { sanitizeUserInput, FIELD_LIMITS } from '@/lib/ai/security/sanitizer'
import { searchSimilar } from '@/lib/ai/embeddings'
import { buildSystemPrompt } from '@/lib/ai/copilot/system-prompt'
import { toolRegistry } from '@/lib/mcp/tool-registry'
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
      // Build tools object from shared registry
      tools: Object.fromEntries(
        toolRegistry.map(t => [
          t.name,
          tool({
            description: t.description,
            inputSchema: t.inputSchema,
            execute: async (params) => t.execute(companyId, params as Record<string, unknown>),
          }),
        ])
      ),
      stopWhen: stepCountIs(5),
      temperature: 0.3,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[ai/stream] Unexpected error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
