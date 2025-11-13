// app/auth/confirm/route.ts
// Day 10: Email Verification Handler

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
    const supabase = createRouteHandlerClient({ cookies });

    try {
      // Verify the OTP token
      const { error } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      });

      if (!error) {
        // Email confirmed successfully - redirect to dashboard
        return NextResponse.redirect(new URL(next, request.url));
      }

      // Error during confirmation
      console.error('Email verification error:', error);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent('Weryfikacja email nie powiodła się. Link może być wygasły.')}`,
          request.url
        )
      );
    } catch (err) {
      console.error('Verification exception:', err);
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
