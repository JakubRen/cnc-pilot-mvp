import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth-server'
import {
  saveConversation,
  getConversationHistory,
} from '@/lib/ai/copilot/conversations'

// GET: list conversations for current user
export async function GET() {
  try {
    const userProfile = await getUserProfile()
    if (!userProfile?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversations = await getConversationHistory(userProfile.id)

    return NextResponse.json({
      success: true,
      conversations,
    })
  } catch (error) {
    console.error('[ai/conversations] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: save/update conversation
export async function POST(request: NextRequest) {
  try {
    const userProfile = await getUserProfile()
    if (!userProfile?.company_id || !userProfile?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const conversationId = await saveConversation({
      companyId: userProfile.company_id,
      userId: userProfile.id,
      conversationId: body.conversationId,
      messages: body.messages,
      context: body.context,
      title: body.title,
    })

    if (!conversationId) {
      return NextResponse.json({ error: 'Failed to save conversation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      conversationId,
    })
  } catch (error) {
    console.error('[ai/conversations] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
