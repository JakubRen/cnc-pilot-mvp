// ============================================
// hooks/useOperators.ts
// Hook to fetch operators for assignment dropdown
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Operator {
  id: number;
  full_name: string;
  email: string;
  role: string;
}

export function useOperators() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOperators() {
      try {
        // Get current user's company_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: userProfile } = await supabase
          .from('users')
          .select('company_id')
          .eq('auth_id', user.id)
          .single();

        if (!userProfile?.company_id) {
          setLoading(false);
          return;
        }

        // Fetch operators (role = 'operator') from the same company
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, full_name, email, role')
          .eq('company_id', userProfile.company_id)
          .in('role', ['operator', 'admin', 'manager', 'owner']) // All who can work on orders
          .order('full_name', { ascending: true });

        if (fetchError) throw fetchError;

        setOperators(data || []);
      } catch (err) {
        console.error('Error fetching operators:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch operators');
      } finally {
        setLoading(false);
      }
    }

    fetchOperators();
  }, []);

  return { operators, loading, error };
}
