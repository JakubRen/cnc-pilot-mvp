import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

// Rate limiter: 30 feedback submissions per minute per user
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 300, // Max 300 users tracked
})

/**
 * AI Feedback Loop - Data Collection Endpoint
 *
 * Captures the difference between AI suggestions and user corrections.
 * This builds our unique training dataset (Golden Dataset / CNC MOAT).
 *
 * Fire & Forget - UI doesn't wait for this.
 * Silent failures - errors logged but don't affect user experience.
 */

interface FeedbackPayload {
  feature_name: string
  input_context?: Record<string, unknown>
  ai_output: string | number
  user_correction: string | number
  correction_reason?: string
  session_id?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get user from session for rate limiting
    const { data: { user } } = await supabase.auth.getUser()

    // Rate limiting - 30 requests per minute per user
    if (user) {
      try {
        await limiter.check(30, user.id)
      } catch {
        return NextResponse.json(
          { status: 'rate_limited', error: 'Zbyt wiele feedbacków. Spróbuj ponownie za chwilę.' },
          { status: 429 }
        )
      }
    }

    const json: FeedbackPayload = await request.json()
    const { feature_name, input_context, ai_output, user_correction, correction_reason, session_id, metadata } = json

    // VALIDATION: Don't log if user didn't change anything
    // This saves database space and keeps data clean
    if (!user_correction || String(ai_output) === String(user_correction)) {
      return NextResponse.json({ status: 'skipped_no_change' })
    }

    // VALIDATION: Feature name is required
    if (!feature_name) {
      return NextResponse.json({ error: 'feature_name is required' }, { status: 400 })
    }

    // User already fetched for rate limiting above

    if (!user) {
      // Silent fail for unauthenticated users (shouldn't happen but don't break UX)
      logger.warn('[FeedbackAPI] No authenticated user, skipping feedback log')
      return NextResponse.json({ status: 'skipped_no_auth' })
    }

    // Get user profile for user_id and company_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('auth_id', user.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('[FeedbackAPI] Could not get user profile', { error: profileError?.message })
      return NextResponse.json({ status: 'skipped_no_profile' })
    }

    // INSERT feedback log
    const { error: insertError } = await supabase.from('ai_feedback_logs').insert({
      user_id: userProfile.id,
      company_id: userProfile.company_id,
      feature_name,
      input_context: input_context || null,
      ai_output: String(ai_output),
      user_correction: String(user_correction),
      correction_reason: correction_reason || null,
      session_id: session_id || null,
      metadata: metadata || null,
    })

    if (insertError) {
      // Log error but don't fail - this is background data collection
      logger.error('[FeedbackAPI] Insert error', { error: insertError.message })
      return NextResponse.json({ status: 'error', error: insertError.message }, { status: 500 })
    }

    // Success - feedback logged
    return NextResponse.json({ status: 'logged' })
  } catch (error) {
    // Catch-all - never crash the app for feedback logging
    logger.error('[FeedbackAPI] Unexpected error', { error })
    return NextResponse.json({ status: 'error', error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET endpoint for fetching feedback analytics (admin/analytics use)
 * Requires authentication and returns company-scoped data
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id
    const { data: userProfile } = await supabase.from('users').select('company_id').eq('auth_id', user.id).single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'No company assigned' }, { status: 403 })
    }

    // Parse query params
    const url = new URL(request.url)
    const feature = url.searchParams.get('feature')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('ai_feedback_logs')
      .select('*', { count: 'exact' })
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (feature) {
      query = query.eq('feature_name', feature)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('[FeedbackAPI] Fetch error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count,
      limit,
      offset,
    })
  } catch (error) {
    logger.error('[FeedbackAPI] Unexpected error', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
