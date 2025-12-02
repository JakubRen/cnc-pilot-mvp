// ============================================
// API: SEND EMAIL - CNC-Pilot
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  sendEmail,
  generateOrderCreatedEmail,
  generateStatusChangedEmail,
  generateDeadlineApproachingEmail,
  generateLowStockAlertEmail,
  generateTeamInviteEmail,
  generateWelcomeEmail,
  EmailType,
  OrderEmailData,
  StockAlertData,
  TeamInviteData,
} from '@/lib/email'

interface SendEmailRequest {
  type: EmailType
  recipients: string[]
  data: OrderEmailData | StockAlertData | TeamInviteData | { userName: string; companyName: string }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile and company
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, company_id, full_name')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: 'No company' }, { status: 403 })
    }

    const body: SendEmailRequest = await req.json()
    const { type, recipients, data } = body

    if (!type || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'Missing type or recipients' }, { status: 400 })
    }

    // Generate email based on type
    let emailPayload
    switch (type) {
      case 'order_created':
        emailPayload = generateOrderCreatedEmail(data as OrderEmailData)
        break
      case 'order_status_changed':
        emailPayload = generateStatusChangedEmail(data as OrderEmailData)
        break
      case 'deadline_approaching':
        emailPayload = generateDeadlineApproachingEmail(data as OrderEmailData)
        break
      case 'low_stock_alert':
        emailPayload = generateLowStockAlertEmail(data as StockAlertData)
        break
      case 'team_invitation':
        emailPayload = generateTeamInviteEmail(data as TeamInviteData)
        break
      case 'welcome':
        const welcomeData = data as { userName: string; companyName: string }
        emailPayload = generateWelcomeEmail(welcomeData.userName, welcomeData.companyName)
        break
      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    // Send to all recipients
    const results = await Promise.all(
      recipients.map(async (email) => {
        const result = await sendEmail({
          ...emailPayload,
          to: email,
        })
        return { email, ...result }
      })
    )

    // Log email send attempt (ignore errors if table doesn't exist)
    try {
      await supabase.from('email_logs').insert({
        company_id: userProfile.company_id,
        sent_by: userProfile.id,
        email_type: type,
        recipients,
        subject: emailPayload.subject,
        success: results.every(r => r.success),
      })
    } catch {
      // Ignore if table doesn't exist
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('[API/EMAIL] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
