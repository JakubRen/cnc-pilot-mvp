import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - require authentication
  const isProtectedRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/users') ||
    request.nextUrl.pathname.startsWith('/orders') ||
    request.nextUrl.pathname.startsWith('/inventory') ||
    request.nextUrl.pathname.startsWith('/time-tracking') ||
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/pending-activation')

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check user role for pending activation
  if (user && isProtectedRoute) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    const userRole = userData?.role

    // If user has pending role, redirect to pending-activation page
    if (userRole === 'pending' && request.nextUrl.pathname !== '/pending-activation') {
      return NextResponse.redirect(new URL('/pending-activation', request.url))
    }

    // If user is NOT pending but tries to access pending-activation, redirect to dashboard
    if (userRole !== 'pending' && request.nextUrl.pathname === '/pending-activation') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/users/:path*',
    '/orders/:path*',
    '/inventory/:path*',
    '/time-tracking/:path*',
    '/dashboard/:path*',
    '/pending-activation',
    '/login',
    '/register',
  ],
}
