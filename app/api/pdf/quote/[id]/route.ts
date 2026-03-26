import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import { fetchQuotePdfData } from '@/lib/pdf/fetch-quote'
import { renderQuotePdf } from '@/lib/pdf/render'
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

    const data = await fetchQuotePdfData(id, userProfile.company_id)
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const buffer = await renderQuotePdf(data)
    const fileName = `Wycena_${data.quote_number}_${sanitizeFileName(data.customer_name)}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[api/pdf/quote] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
