'use client';

// ============================================
// CLIENT-SIDE PERMISSIONS HOOK - CNC-Pilot
// ============================================
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type {
  UserPermissionsMap,
  PermissionsContextType,
  AppModule,
  PermissionCode,
} from '@/types/permissions';

// Context
const PermissionsContext = createContext<PermissionsContextType | null>(null);

// LocalStorage key
const PERMISSIONS_CACHE_KEY = 'cnc-pilot-permissions';
const PERMISSIONS_TIMESTAMP_KEY = 'cnc-pilot-permissions-ts';
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Helper: get cached permissions from localStorage (sync)
function getCachedPermissions(): UserPermissionsMap | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(PERMISSIONS_CACHE_KEY);
    const timestamp = localStorage.getItem(PERMISSIONS_TIMESTAMP_KEY);
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_MAX_AGE) {
        return JSON.parse(cached);
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

// Helper: save permissions to localStorage
function cachePermissions(permissions: UserPermissionsMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(permissions));
    localStorage.setItem(PERMISSIONS_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

// Provider Props
interface PermissionsProviderProps {
  children: ReactNode;
  /** Początkowe uprawnienia (z Server Component) */
  initialPermissions?: UserPermissionsMap;
}

/**
 * Provider uprawnień - opakowuje aplikację
 * Używa localStorage cache dla instant loading (stale-while-revalidate)
 */
export function PermissionsProvider({
  children,
  initialPermissions = {},
}: PermissionsProviderProps) {
  // Try to get cached permissions for instant display
  const cachedPermissions = useMemo(() => {
    if (Object.keys(initialPermissions).length > 0) {
      return initialPermissions;
    }
    return getCachedPermissions() || {};
  }, [initialPermissions]);

  const [permissions, setPermissions] = useState<UserPermissionsMap>(cachedPermissions);
  // Start as not loading if we have cached or initial permissions
  const [loading, setLoading] = useState(Object.keys(cachedPermissions).length === 0);

  // Funkcja pobierająca uprawnienia
  const fetchPermissions = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Pobierz aktualnego użytkownika
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPermissions({});
        cachePermissions({});
        return;
      }

      // Pobierz profil z rolą
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, role')
        .eq('auth_id', user.id)
        .single();

      if (profileError || !profile) {
        logger.error('Error fetching user profile', { error: profileError });
        setPermissions({});
        return;
      }

      // Pobierz domyślne uprawnienia roli
      const { data: rolePerms, error: roleError } = await supabase
        .from('role_permissions')
        .select('permission_code')
        .eq('role', profile.role);

      if (roleError) {
        logger.error('Error fetching role permissions', { error: roleError });
      }

      // Pobierz nadpisania użytkownika
      const { data: userOverrides, error: overrideError } = await supabase
        .from('user_permissions')
        .select('permission_code, granted')
        .eq('user_id', profile.id);

      if (overrideError) {
        logger.error('Error fetching user overrides', { error: overrideError });
      }

      // Zbuduj mapę
      const map: UserPermissionsMap = {};
      rolePerms?.forEach((rp) => {
        map[rp.permission_code] = true;
      });
      userOverrides?.forEach((up) => {
        map[up.permission_code] = up.granted;
      });

      setPermissions(map);
      cachePermissions(map); // Cache for next page load
    } catch (error) {
      logger.error('Error fetching permissions', { error });
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Pobierz uprawnienia na start
  // Jeśli mamy cache, fetch w tle bez loading (stale-while-revalidate)
  useEffect(() => {
    const hasInitial = Object.keys(initialPermissions).length > 0;
    const hasCached = Object.keys(cachedPermissions).length > 0;

    if (hasInitial) {
      // Mamy initial z serwera - nie fetch
      return;
    }

    if (hasCached) {
      // Mamy cache - fetch w tle bez loading
      fetchPermissions(false);
    } else {
      // Brak cache - fetch z loading
      fetchPermissions(true);
    }
  }, [fetchPermissions, initialPermissions, cachedPermissions]);

  // Helper functions
  const hasPermission = useCallback(
    (code: PermissionCode | string): boolean => {
      return permissions[code] === true;
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (codes: (PermissionCode | string)[]): boolean => {
      return codes.some((code) => permissions[code] === true);
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (codes: (PermissionCode | string)[]): boolean => {
      return codes.every((code) => permissions[code] === true);
    },
    [permissions]
  );

  const canViewPrices = useCallback(
    (module: AppModule): boolean => {
      return permissions[`${module}:prices`] === true;
    },
    [permissions]
  );

  const canAccess = useCallback(
    (module: AppModule): boolean => {
      return permissions[`${module}:access`] === true;
    },
    [permissions]
  );

  const canEdit = useCallback(
    (module: AppModule): boolean => {
      return permissions[`${module}:edit`] === true;
    },
    [permissions]
  );

  const canDelete = useCallback(
    (module: AppModule): boolean => {
      return permissions[`${module}:delete`] === true;
    },
    [permissions]
  );

  const canCreate = useCallback(
    (module: AppModule): boolean => {
      return permissions[`${module}:create`] === true;
    },
    [permissions]
  );

  const value: PermissionsContextType = {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canViewPrices,
    canAccess,
    canEdit,
    canDelete,
    canCreate,
    refresh: fetchPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
  );
}

/**
 * Hook do używania uprawnień w komponentach
 */
export function usePermissions(): PermissionsContextType {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
}

/**
 * Hook do sprawdzania konkretnego uprawnienia
 */
export function useHasPermission(code: PermissionCode | string): boolean {
  const { hasPermission, loading } = usePermissions();
  if (loading) return false;
  return hasPermission(code);
}

/**
 * Hook do sprawdzania dostępu do modułu
 */
export function useCanAccess(module: AppModule): boolean {
  const { canAccess, loading } = usePermissions();
  if (loading) return false;
  return canAccess(module);
}

/**
 * Hook do sprawdzania widoczności cen
 */
export function useCanViewPrices(module: AppModule): boolean {
  const { canViewPrices, loading } = usePermissions();
  if (loading) return false;
  return canViewPrices(module);
}
