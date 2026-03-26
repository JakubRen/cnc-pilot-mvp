import { NextRequest, NextResponse } from 'next/server'
import { fetchQuotePdfDataByToken } from '@/lib/pdf/fetch-quote'
import { renderQuotePdf } from '@/lib/pdf/render'
import { sanitizeFileName } from '@/lib/pdf/styles'

/**
 * Public route — no authentication required.
 * Validates the quote token and checks expiration.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const data = await fetchQuotePdfDataByToken(token)
    if (!data) {
      return NextResponse.json(
        { error: 'Quote not found or expired' },
        { status: 404 }
      )
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
    console.error('[api/pdf/quote/view] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
