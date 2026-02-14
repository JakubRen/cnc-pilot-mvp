'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'

function getGenAI(): GoogleGenerativeAI | null {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return null
  }
  return new GoogleGenerativeAI(apiKey)
}

export interface CallGeminiOptions<T> {
  prompt: string
  responseSchema: Record<string, unknown>
  temperature?: number
  model?: string
  /** Label for logging */
  label?: string
}

export interface CallGeminiResult<T> {
  data: T
  model: string
}

/**
 * Unified Gemini wrapper with structured JSON output.
 * Returns null when API key is missing or on rate-limit / error.
 */
export async function callGemini<T>(
  options: CallGeminiOptions<T>
): Promise<CallGeminiResult<T> | null> {
  const {
    prompt,
    responseSchema,
    temperature = 0.3,
    model: modelName = 'gemini-2.5-flash',
    label = 'callGemini',
  } = options

  const genAI = getGenAI()
  if (!genAI) {
    logger.warn(`[${label}] No GOOGLE_GENERATIVE_AI_API_KEY — skipping AI call`)
    return null
  }

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
        responseSchema: responseSchema as Parameters<typeof genAI.getGenerativeModel>[0]['generationConfig'] extends { responseSchema?: infer S } ? S : never,
      },
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text) as T

    return { data: parsed, model: modelName }
  } catch (error: unknown) {
    // Detect rate limiting
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      logger.warn(`[${label}] Rate limited by Gemini API`, { error: errorMsg })
    } else {
      logger.error(`[${label}] Gemini API error`, { error: errorMsg })
    }
    return null
  }
}

// ============================================
// PLAIN TEXT VARIANT
// ============================================

export interface CallGeminiTextOptions {
  prompt: string
  temperature?: number
  model?: string
  label?: string
}

/**
 * Gemini wrapper for plain-text (non-JSON) responses.
 * Use for summaries, descriptions, and other free-form text.
 * Returns null when API key is missing or on error.
 */
export async function callGeminiText(
  options: CallGeminiTextOptions
): Promise<{ text: string; model: string } | null> {
  const {
    prompt,
    temperature = 0.5,
    model: modelName = 'gemini-2.5-flash',
    label = 'callGeminiText',
  } = options

  const genAI = getGenAI()
  if (!genAI) {
    logger.warn(`[${label}] No GOOGLE_GENERATIVE_AI_API_KEY — skipping AI call`)
    return null
  }

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature },
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return { text, model: modelName }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      logger.warn(`[${label}] Rate limited by Gemini API`, { error: errorMsg })
    } else {
      logger.error(`[${label}] Gemini API error`, { error: errorMsg })
    }
    return null
  }
}
