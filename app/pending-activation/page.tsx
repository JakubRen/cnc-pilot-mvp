// app/pending-activation/page.tsx
// Day 10: Pending Activation - Wait for Admin Approval

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function PendingActivationPage() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUserStatus = async () => {
    try {
      // Get current auth user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || '');

      // Check user role in database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single();

      if (error) {
        logger.error('Error checking user status', { error });
        return;
      }

      // If user is no longer pending, redirect to dashboard
      if (userData?.role !== 'pending') {
        router.push('/');
      }
    } catch (error) {
      logger.error('Error in checkUserStatus', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleRefresh = () => {
    setLoading(true);
    checkUserStatus();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md w-full">
        <div className="text-center">
          {/* Icon */}
          <div className="text-6xl mb-6">⏳</div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-4">
            Oczekiwanie na aktywację
          </h1>

          {/* Description */}
          <p className="text-slate-300 mb-4">
            Twoje konto zostało utworzone pomyślnie!
          </p>

          <div className="bg-slate-700/50 p-4 rounded-lg mb-6">
            <p className="text-sm text-slate-300 mb-2">
              📧 <strong>{userEmail}</strong>
            </p>
            <p className="text-sm text-slate-400">
              Administrator musi aktywować Twoje konto zanim będziesz mógł uzyskać dostęp do systemu.
            </p>
          </div>

          {/* Info */}
          <div className="text-left space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-violet-400 text-xl">①</span>
              <div>
                <p className="text-slate-300 text-sm font-medium">
                  Konto zostało utworzone
                </p>
                <p className="text-slate-400 text-xs">
                  Administrator otrzymał powiadomienie
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-slate-500 text-xl">②</span>
              <div>
                <p className="text-slate-400 text-sm">
                  Oczekiwanie na aktywację...
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-slate-500 text-xl">③</span>
              <div>
                <p className="text-slate-400 text-sm">
                  Dostęp do systemu
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
            >
              🔄 Sprawdź status
            </button>

            <button
              onClick={handleSignOut}
              className="w-full py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
            >
              Wyloguj się
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-slate-400 text-xs">
              Pytania? Skontaktuj się z administratorem w swojej firmie.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
