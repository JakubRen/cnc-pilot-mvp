import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import { renderToBuffer } from '@react-pdf/renderer'
import OrderSummaryTemplate from '@/lib/pdf/order-summary-template'
import { fetchOrderPdfData } from '@/lib/pdf/fetch-order'
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

    const data = await fetchOrderPdfData(id, userProfile.company_id)
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const buffer = await renderToBuffer(<OrderSummaryTemplate data={data} />)
    const fileName = `Zamowienie_${data.order_number}_${sanitizeFileName(data.customer_name)}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[api/pdf/order] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
