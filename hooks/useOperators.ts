// ============================================
// hooks/useOperators.ts
// Hook to fetch operators for assignment dropdown
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useUserProfile } from '@/hooks/useUserProfile';

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
  const { profile } = useUserProfile();

  useEffect(() => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    async function fetchOperators() {
      try {
        // Fetch operators (role = 'operator') from the same company
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, full_name, email, role')
          .eq('company_id', profile!.company_id!)
          .in('role', ['operator', 'admin', 'manager', 'owner']) // All who can work on orders
          .order('full_name', { ascending: true });

        if (fetchError) throw fetchError;

        setOperators(data || []);
      } catch (err) {
        logger.error('Error fetching operators', { error: err });
        setError(err instanceof Error ? err.message : 'Failed to fetch operators');
      } finally {
        setLoading(false);
      }
    }

    fetchOperators();
  }, [profile?.company_id]);

  return { operators, loading, error };
}
