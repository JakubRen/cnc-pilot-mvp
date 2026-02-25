// app/forgot-password/page.tsx
// Day 10: Forgot Password - Request Password Reset

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('Link resetujący został wysłany!');
    } catch (err: unknown) {
      const error = err as Error | null
      toast.error(error?.message || 'Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-md w-full">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Sprawdź swoją skrzynkę email
              </h2>
              <p className="text-slate-300 mb-4">
                Wysłaliśmy link do resetowania hasła na adres:
              </p>
              <p className="text-blue-400 font-medium mb-6">{email}</p>
              <div className="bg-slate-700/50 p-4 rounded-lg mb-6">
                <p className="text-sm text-slate-300 mb-2">
                  ✅ Link został wysłany
                </p>
                <p className="text-sm text-slate-300">
                  🔒 Link jest ważny przez 1 godzinę
                </p>
              </div>
              <p className="text-slate-400 text-sm mb-6">
                Nie widzisz emaila? Sprawdź folder SPAM.
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                ← Powrót do logowania
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Request form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CNC-Pilot</h1>
          <p className="text-slate-400">System Zarządzania Produkcją</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Zapomniałeś hasła?
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-slate-300 mb-2">
                Adres email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="jan.kowalski@firma.pl"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
            >
              {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              ← Powrót do logowania
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
