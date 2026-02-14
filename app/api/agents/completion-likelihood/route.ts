import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import { getOrderCompletionLikelihoods } from '@/lib/ai/features/deadline-monitor'

// =====================================================
// GET /api/agents/completion-likelihood
// Returns completion likelihood for orders approaching deadlines.
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const userProfile = await getUserProfile()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = userProfile.company_id

    // Optional query param: daysAhead (default 7)
    const { searchParams } = new URL(request.url)
    const daysAhead = Math.min(30, Math.max(1, Number(searchParams.get('days_ahead')) || 7))

    const likelihoods = await getOrderCompletionLikelihoods(companyId, daysAhead)

    // Transform to snake_case for frontend
    const data = likelihoods.map(l => ({
      order_id: l.orderId,
      order_number: l.orderNumber,
      customer_name: l.customerName,
      deadline: l.deadline,
      days_remaining: l.daysRemaining,
      completion_likelihood: l.completionLikelihood,
      completion_recommendation: l.statusSummary,
      risk: l.risk,
      production_progress: l.productionProgress,
    }))

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      days_ahead: daysAhead,
    })
  } catch (error) {
    console.error('[completion-likelihood] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
