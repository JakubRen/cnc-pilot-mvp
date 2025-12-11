// app/auth/confirm/route.ts
// Day 10: Email Verification Handler

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Handles email confirmation links from Supabase
 * Called when user clicks confirmation link in email
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  // Verify we have required params
  if (token_hash && type) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    try {
      // Verify the OTP token
      const { error } = await supabase.auth.verifyOtp({
        type: type as 'signup' | 'recovery' | 'invite' | 'email' | 'magiclink',
        token_hash,
      });

      if (!error) {
        // Email confirmed successfully - redirect to dashboard
        return NextResponse.redirect(new URL(next, request.url));
      }

      // Error during confirmation
      logger.error('Email verification error', { error });
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent('Weryfikacja email nie powiodła się. Link może być wygasły.')}`,
          request.url
        )
      );
    } catch (err) {
      logger.error('Verification exception', { error: err });
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent('Wystąpił błąd podczas weryfikacji.')}`,
          request.url
        )
      );
    }
  }

  // Missing token or type - invalid link
  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent('Nieprawidłowy link aktywacyjny.')}`,
      request.url
    )
  );
}
