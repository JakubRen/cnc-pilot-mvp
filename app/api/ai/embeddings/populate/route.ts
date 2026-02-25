import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import {
  populateProductEmbeddings,
  populateOrderEmbeddings,
  populateCustomerEmbeddings,
  populateMachineEmbeddings,
} from '@/lib/ai/embedding-pipeline'

export async function POST(request: NextRequest) {
  try {
    const userProfile = await getUserProfile()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owner/admin can populate embeddings
    if (!['owner', 'admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden — requires owner or admin role' }, { status: 403 })
    }

    const companyId = userProfile.company_id
    const body = await request.json()
    const sourceTypes: string[] = body.sourceTypes || ['product', 'order', 'customer', 'machine']

    const results: Record<string, number> = {}

    if (sourceTypes.includes('product')) {
      results.products = await populateProductEmbeddings(companyId)
    }
    if (sourceTypes.includes('order')) {
      results.orders = await populateOrderEmbeddings(companyId)
    }
    if (sourceTypes.includes('customer')) {
      results.customers = await populateCustomerEmbeddings(companyId)
    }
    if (sourceTypes.includes('machine')) {
      results.machines = await populateMachineEmbeddings(companyId)
    }

    const total = Object.values(results).reduce((sum, n) => sum + n, 0)

    return NextResponse.json({
      success: true,
      total,
      breakdown: results,
    })
  } catch (error) {
    console.error('[embeddings/populate] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
