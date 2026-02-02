// ============================================
// API Route: Create User
// Owner/Admin tworzy użytkownika z hasłem
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserProfile } from '@/lib/auth-server'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import { BUSINESS } from '@/lib/constants/time'

// Rate limiter: 5 user creations per minute per admin
const limiter = rateLimit({
  interval: BUSINESS.RATE_LIMIT_WINDOW_MS,
  uniqueTokenPerInterval: 200, // Max 200 admins tracked
})

interface CreateUserRequest {
  email: string
  password: string
  full_name: string
  role: 'operator' | 'manager' | 'admin' | 'viewer'
  sendInvite?: boolean
}

export async function POST(request: NextRequest) {
  try {
    // 1. Sprawdź czy użytkownik jest zalogowany i ma uprawnienia
    const currentUser = await getUserProfile()

    if (!currentUser?.company_id) {
      return NextResponse.json(
        { error: 'Nie jesteś zalogowany' },
        { status: 401 }
      )
    }

    // Rate limiting - 5 requests per minute per user
    try {
      await limiter.check(5, currentUser.email)
    } catch {
      return NextResponse.json(
        { error: 'Zbyt wiele żądań. Poczekaj chwilę przed utworzeniem kolejnego użytkownika.' },
        { status: 429 }
      )
    }

    if (!['owner', 'admin'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Brak uprawnień do tworzenia użytkowników' },
        { status: 403 }
      )
    }

    // 2. Parsuj dane z requestu
    const body: CreateUserRequest = await request.json()
    const { email, password, full_name, role, sendInvite } = body

    // Walidacja
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Wszystkie pola są wymagane' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Hasło musi mieć minimum 8 znaków' },
        { status: 400 }
      )
    }

    // Admin nie może tworzyć ownerów ani innych adminów
    if (currentUser.role === 'admin' && ['owner', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Admin nie może tworzyć użytkowników z rolą owner lub admin' },
        { status: 403 }
      )
    }

    // 3. Sprawdź czy email już istnieje
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Użytkownik z tym adresem email już istnieje' },
        { status: 400 }
      )
    }

    // 4. Utwórz konto w auth.users przez Admin API
    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatycznie potwierdź email
      user_metadata: {
        full_name,
      },
    })

    if (authError) {
      logger.error('Auth error', { error: authError })
      return NextResponse.json(
        { error: 'Błąd tworzenia konta: ' + authError.message },
        { status: 500 }
      )
    }

    // 5. Utwórz rekord w tabeli users
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: newAuthUser.user.id,
        email,
        full_name,
        role,
        company_id: currentUser.company_id,
      })

    if (insertError) {
      logger.error('Insert error', { error: insertError })
      // Spróbuj usunąć konto auth jeśli insert się nie powiódł
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json(
        { error: 'Błąd tworzenia profilu: ' + insertError.message },
        { status: 500 }
      )
    }

    // 6. Opcjonalnie wyślij email z zaproszeniem
    if (sendInvite) {
      // Tu można dodać wysyłkę emaila z danymi logowania
      // Na razie pomijamy - użytkownik sam poda dane nowemu pracownikowi
    }

    return NextResponse.json({
      success: true,
      message: 'Użytkownik utworzony pomyślnie',
      user: {
        email,
        full_name,
        role,
      },
    })

  } catch (error) {
    logger.error('Create user error', { error })
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd' },
      { status: 500 }
    )
  }
}
