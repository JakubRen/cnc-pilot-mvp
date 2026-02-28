import { NextRequest, NextResponse } from 'next/server'
import { getStoredFile } from '@/lib/ai/copilot/report-tools'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const stored = getStoredFile(fileId)

  if (!stored) {
    return NextResponse.json({ error: 'Report expired or not found' }, { status: 404 })
  }

  return new Response(new Uint8Array(stored.buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${stored.name}"`,
    },
  })
}
