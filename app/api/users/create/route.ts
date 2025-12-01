// ============================================
// API Route: Create User
// Owner/Admin tworzy użytkownika z hasłem
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(
        { error: 'Nie jesteś zalogowany' },
        { status: 401 }
      )
    }

    // Pobierz profil użytkownika (musi być owner/admin)
    const { data: currentUser, error: profileError } = await supabase
      .from('users')
      .select('id, role, company_id')
      .eq('auth_id', authUser.id)
      .single()

    if (profileError || !currentUser) {
      return NextResponse.json(
        { error: 'Nie znaleziono profilu użytkownika' },
        { status: 403 }
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
      console.error('Auth error:', authError)
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
      console.error('Insert error:', insertError)
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
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd' },
      { status: 500 }
    )
  }
}
