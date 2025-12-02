import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Generate new token for customer
export async function POST(request: NextRequest) {
  try {
    const user = await getUserProfile()

    if (!user || !user.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { customer_name } = body

    if (!customer_name) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if active token already exists for this customer
    const { data: existingToken } = await supabase
      .from('client_access_tokens')
      .select('token')
      .eq('company_id', user.company_id)
      .eq('customer_name', customer_name)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingToken) {
      // Return existing token
      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client-portal/${existingToken.token}`
      return NextResponse.json({
        token: existingToken.token,
        url: portalUrl,
        existing: true
      })
    }

    // Create new token
    const { data: newToken, error } = await supabase
      .from('client_access_tokens')
      .insert({
        company_id: user.company_id,
        customer_name,
        created_by: user.id,
      })
      .select('token')
      .single()

    if (error) {
      console.error('Error creating token:', error)
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client-portal/${newToken.token}`

    return NextResponse.json({
      token: newToken.token,
      url: portalUrl,
      existing: false
    })
  } catch (error) {
    console.error('Client portal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get tokens for current company
export async function GET() {
  try {
    const user = await getUserProfile()

    if (!user || !user.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: tokens, error } = await supabase
      .from('client_access_tokens')
      .select('*')
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
    }

    return NextResponse.json({ tokens })
  } catch (error) {
    console.error('Client portal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Deactivate token
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserProfile()

    if (!user || !user.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('id')

    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('client_access_tokens')
      .update({ is_active: false })
      .eq('id', tokenId)
      .eq('company_id', user.company_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to deactivate token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Client portal API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
