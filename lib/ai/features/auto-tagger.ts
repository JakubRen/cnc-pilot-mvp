// Automatic Order Tagging (Phase 1 — Feature 1.4)
// Heuristic tagging from structured fields + optional AI enrichment for free-text
//
// Two-layer pattern:
//   1. suggestTags()       — pure heuristic, no DB/AI deps, always runs
//   2. enrichTagsWithAI()  — optional Gemini call for notes/email body
//   3. applyTagSuggestions() — writes tags to DB (tags + entity_tags tables)

import { createClient } from '@/lib/supabase-server'
import { callGemini } from '@/lib/ai/gemini-client'
import { SchemaType } from '@/lib/ai/schema-types'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export type TagCategory = 'material_type' | 'complexity' | 'urgency' | 'machine_type' | 'process'

export interface TagSuggestion {
  tag: string
  category: TagCategory
  confidence: number // 0-100
}

export interface OrderTagInput {
  partName?: string
  material?: string
  dimensions?: string
  quantity?: number
  deadline?: string
  notes?: string
  complexity?: 'simple' | 'medium' | 'complex'
}

// ============================================
// 1. HEURISTIC TAGGER (pure, no side effects)
// ============================================

export function suggestTags(input: OrderTagInput): TagSuggestion[] {
  const tags: TagSuggestion[] = []

  // Material type tagging
  if (input.material) {
    const mat = input.material.toLowerCase()
    if (mat.includes('stal') || mat.includes('steel')) {
      tags.push({ tag: 'stal', category: 'material_type', confidence: 90 })
      if (mat.includes('nierdzewna') || mat.includes('304') || mat.includes('316') || mat.includes('inox')) {
        tags.push({ tag: 'stal_nierdzewna', category: 'material_type', confidence: 95 })
      }
    }
    if (mat.includes('aluminium') || mat.includes('alu') || mat.includes('6061') || mat.includes('7075')) {
      tags.push({ tag: 'aluminium', category: 'material_type', confidence: 90 })
    }
    if (mat.includes('miedz') || mat.includes('copper') || mat.includes('brass') || mat.includes('mosiądz')) {
      tags.push({ tag: 'miedz', category: 'material_type', confidence: 85 })
    }
    if (mat.includes('plastik') || mat.includes('pom') || mat.includes('peek') || mat.includes('delrin')) {
      tags.push({ tag: 'tworzywo', category: 'material_type', confidence: 85 })
    }
  }

  // Complexity tagging
  if (input.complexity) {
    tags.push({ tag: input.complexity, category: 'complexity', confidence: 95 })
  } else if (input.dimensions) {
    // Heuristic: 3D dimensions (3 parts) = at least medium complexity
    const dimParts = input.dimensions.split(/[x×X*]/g).filter(Boolean)
    if (dimParts.length >= 3) {
      tags.push({ tag: 'medium', category: 'complexity', confidence: 60 })
    }
  }

  // Urgency tagging based on deadline
  if (input.deadline) {
    const deadlineDate = new Date(input.deadline)
    const now = new Date()
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil <= 3) {
      tags.push({ tag: 'pilne', category: 'urgency', confidence: 95 })
    } else if (daysUntil <= 7) {
      tags.push({ tag: 'priorytet', category: 'urgency', confidence: 80 })
    } else {
      tags.push({ tag: 'standardowe', category: 'urgency', confidence: 70 })
    }
  }

  // Quantity-based process tagging
  if (input.quantity && input.quantity >= 100) {
    tags.push({ tag: 'seria', category: 'process', confidence: 85 })
  } else if (input.quantity && input.quantity === 1) {
    tags.push({ tag: 'prototyp', category: 'process', confidence: 60 })
  }

  return tags
}

// ============================================
// 2. AI ENRICHMENT (optional, additive)
// ============================================

/**
 * Enrich tag suggestions with AI analysis of free-text fields (notes, part name).
 * Merges AI suggestions into existing heuristic tags — deduplicates by tag name.
 * If AI fails, heuristic tags are returned unchanged.
 */
export async function enrichTagsWithAI(
  input: OrderTagInput,
  heuristicTags: TagSuggestion[]
): Promise<TagSuggestion[]> {
  // Only call AI if there's free-text to analyze
  const freeText = [input.notes, input.partName].filter(Boolean).join(' ')
  if (freeText.length < 5) return heuristicTags

  const result = await callGemini<{
    suggestions: Array<{ tag: string; category: TagCategory; confidence: number }>
  }>({
    label: 'auto-tagger',
    prompt: `Jestes ekspertem CNC. Na podstawie opisu czesci zaproponuj tagi.

OPIS:
${freeText}

MATERIAL: ${input.material || 'brak'}
WYMIARY: ${input.dimensions || 'brak'}

ISTNIEJACE TAGI (nie powtarzaj):
${heuristicTags.map(t => t.tag).join(', ') || 'brak'}

ZASADY:
- Zwroc 0-3 NOWYCH tagow (nie powtarzaj istniejacych)
- Kategorie: material_type, complexity, urgency, machine_type, process
- machine_type: toczenie, frezowanie, szlifowanie, wiercenie, EDM
- process: prototyp, seria, obrobka_cieplna, anodowanie, galwanizacja
- confidence: 60-90 (AI nie moze dac wiecej niz 90)
- Jezyk polski, bez spacji w tagach (uzyj _ )`,
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        suggestions: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              tag: { type: SchemaType.STRING },
              category: { type: SchemaType.STRING },
              confidence: { type: SchemaType.NUMBER },
            },
            required: ['tag', 'category', 'confidence'],
          },
        },
      },
      required: ['suggestions'],
    },
    temperature: 0.2,
  })

  if (!result) {
    logger.warn('[auto-tagger] AI enrichment failed — returning heuristic tags only')
    return heuristicTags
  }

  // Merge: deduplicate by tag name, heuristic wins on conflicts
  const existingNames = new Set(heuristicTags.map(t => t.tag))
  const aiTags = result.data.suggestions
    .filter(s => !existingNames.has(s.tag))
    .filter(s => s.confidence >= 50 && s.confidence <= 90)
    .map(s => ({
      tag: s.tag,
      category: s.category as TagCategory,
      confidence: Math.min(s.confidence, 90), // AI capped at 90
    }))

  return [...heuristicTags, ...aiTags]
}

// ============================================
// 3. DB PERSISTENCE (apply suggestions)
// ============================================

interface ApplyResult {
  applied: number
  created: number
  errors: string[]
}

/**
 * Apply tag suggestions to an order in the DB.
 * - Matches suggestions against existing company tags by name
 * - Creates new tags for unmatched suggestions (if confidence >= 70)
 * - Links via entity_tags (upserts — safe against duplicates)
 */
export async function applyTagSuggestions(
  companyId: string,
  orderId: string,
  suggestions: TagSuggestion[],
  minConfidence: number = 70
): Promise<ApplyResult> {
  const result: ApplyResult = { applied: 0, created: 0, errors: [] }

  if (suggestions.length === 0) return result

  // Filter by confidence threshold
  const qualified = suggestions.filter(s => s.confidence >= minConfidence)
  if (qualified.length === 0) return result

  try {
    const supabase = await createClient()

    // Fetch existing company tags
    const { data: existingTags, error: fetchError } = await supabase
      .from('tags')
      .select('id, name')
      .eq('company_id', companyId)

    if (fetchError) {
      logger.error('[auto-tagger] Failed to fetch existing tags', { error: fetchError })
      result.errors.push('Failed to fetch existing tags')
      return result
    }

    const tagMap = new Map<string, string>() // name -> id
    for (const t of existingTags || []) {
      tagMap.set(t.name.toLowerCase(), t.id)
    }

    for (const suggestion of qualified) {
      const tagNameLower = suggestion.tag.toLowerCase()
      let tagId = tagMap.get(tagNameLower)

      // Create new tag if not found
      if (!tagId) {
        const color = categoryToColor(suggestion.category)
        const { data: newTag, error: createError } = await supabase
          .from('tags')
          .insert({ company_id: companyId, name: suggestion.tag, color })
          .select('id')
          .single()

        if (createError) {
          // Might be a race condition — try fetching again
          const { data: retry } = await supabase
            .from('tags')
            .select('id')
            .eq('company_id', companyId)
            .ilike('name', suggestion.tag)
            .single()

          if (retry) {
            tagId = retry.id
          } else {
            result.errors.push(`Failed to create tag "${suggestion.tag}"`)
            continue
          }
        } else {
          tagId = newTag.id
          result.created++
        }
      }

      // Link tag to order via entity_tags (upsert-safe via unique constraint)
      const { error: linkError } = await supabase
        .from('entity_tags')
        .upsert(
          { tag_id: tagId, entity_type: 'order', entity_id: orderId },
          { onConflict: 'tag_id,entity_type,entity_id' }
        )

      if (linkError) {
        result.errors.push(`Failed to link tag "${suggestion.tag}" to order`)
      } else {
        result.applied++
      }
    }
  } catch (err) {
    logger.error('[auto-tagger] applyTagSuggestions failed', { error: err })
    result.errors.push('Unexpected error applying tags')
  }

  return result
}

// ============================================
// HELPERS
// ============================================

/** Map tag category to a default color for new tags */
function categoryToColor(category: TagCategory): string {
  const colors: Record<TagCategory, string> = {
    material_type: '#3b82f6', // blue
    complexity: '#f59e0b',    // amber
    urgency: '#ef4444',       // red
    machine_type: '#8b5cf6',  // purple
    process: '#10b981',       // green
  }
  return colors[category] || '#6b7280'
}
