// app/reset-password/page.tsx
// Day 10: Reset Password - Set New Password

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { validatePassword, getPasswordStrength, passwordsMatch } from '@/lib/password-validation';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const validation = validatePassword(password);
  const strength = getPasswordStrength(password);
  const matches = passwordsMatch(password, confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    if (!validation.isValid) {
      toast.error(validation.errors.join('. '));
      return;
    }

    // Check if passwords match
    if (!matches) {
      toast.error('Hasła nie są identyczne');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('Hasło zostało zmienione!');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 3000);

    } catch (err: any) {
      toast.error(err.message || 'Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Hasło zostało zmienione!
          </h2>
          <p className="text-slate-300 mb-6">
            Przekierowanie do strony logowania...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CNC-Pilot</h1>
          <p className="text-slate-400">Production Management System</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Ustaw nowe hasło
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Wprowadź nowe, bezpieczne hasło do swojego konta.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-slate-300 mb-2">
                Nowe hasło
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                required
                minLength={8}
              />

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Siła hasła:</span>
                    <span className={`font-medium ${strength.color}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength.strength === 'weak'
                          ? 'bg-red-500 w-1/3'
                          : strength.strength === 'medium'
                          ? 'bg-yellow-500 w-2/3'
                          : 'bg-green-500 w-full'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-slate-300 mb-2">
                Potwierdź hasło
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                required
              />
              {confirmPassword && !matches && (
                <p className="text-red-400 text-sm mt-1">
                  Hasła nie są identyczne
                </p>
              )}
              {confirmPassword && matches && (
                <p className="text-green-400 text-sm mt-1">
                  ✓ Hasła są identyczne
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-slate-700/50 p-3 rounded-lg">
              <p className="text-xs font-medium text-slate-300 mb-2">
                Wymagania dla hasła:
              </p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li className={password.length >= 8 ? 'text-green-400' : ''}>
                  {password.length >= 8 ? '✓' : '•'} Minimum 8 znaków
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-400' : ''}>
                  {/[A-Z]/.test(password) ? '✓' : '•'} Przynajmniej jedna wielka litera
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-400' : ''}>
                  {/[a-z]/.test(password) ? '✓' : '•'} Przynajmniej jedna mała litera
                </li>
                <li className={/[0-9]/.test(password) ? 'text-green-400' : ''}>
                  {/[0-9]/.test(password) ? '✓' : '•'} Przynajmniej jedna cyfra
                </li>
              </ul>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !validation.isValid || !matches || !confirmPassword}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
            >
              {loading ? 'Zmienianie hasła...' : 'Zmień hasło'}
            </button>
          </form>

          {/* Validation Errors */}
          {password && validation.errors.length > 0 && (
            <div className="mt-4 bg-red-600/10 border border-red-600/50 rounded-lg p-3">
              <p className="text-red-400 text-sm font-medium mb-1">
                Błędy walidacji:
              </p>
              <ul className="text-red-400 text-xs space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
