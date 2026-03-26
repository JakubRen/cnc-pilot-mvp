import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import { fetchProductionPlanPdfData } from '@/lib/pdf/fetch-production-plan'
import { renderProductionPlanPdf } from '@/lib/pdf/render'
import { sanitizeFileName } from '@/lib/pdf/styles'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userProfile = await getUserProfile()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await fetchProductionPlanPdfData(id, userProfile.company_id)
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const buffer = await renderProductionPlanPdf(data)
    const fileName = `Plan_${data.plan_number}_${sanitizeFileName(data.part_name)}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[api/pdf/production-plan] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
