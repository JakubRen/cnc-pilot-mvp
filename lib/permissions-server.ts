// ============================================
// SERVER-SIDE PERMISSIONS - CNC-Pilot
// ============================================
import { cache } from 'react';
import { createClient } from './supabase-server';
import { getUserProfile } from './auth-server';
import type { UserPermissionsMap, AppModule, PermissionCode } from '@/types/permissions';

/**
 * Pobiera uprawnienia użytkownika (SERVER-SIDE)
 * Łączy: domyślne uprawnienia roli + nadpisania per user
 * Cached per request (React cache)
 */
export const getUserPermissions = cache(async (): Promise<UserPermissionsMap> => {
  const supabase = await createClient();
  const userProfile = await getUserProfile();

  if (!userProfile) {
    return {};
  }

  // 1. Pobierz domyślne uprawnienia dla roli użytkownika
  const { data: rolePermissions, error: roleError } = await supabase
    .from('role_permissions')
    .select('permission_code')
    .eq('role', userProfile.role);

  if (roleError) {
    console.error('Error fetching role permissions:', roleError);
  }

  // 2. Pobierz nadpisania dla tego użytkownika
  const { data: userOverrides, error: overrideError } = await supabase
    .from('user_permissions')
    .select('permission_code, granted')
    .eq('user_id', userProfile.id);

  if (overrideError) {
    console.error('Error fetching user overrides:', overrideError);
  }

  // 3. Zbuduj mapę uprawnień
  const permissionsMap: UserPermissionsMap = {};

  // Najpierw dodaj domyślne z roli (wszystkie = true)
  rolePermissions?.forEach((rp) => {
    permissionsMap[rp.permission_code] = true;
  });

  // Potem nadpisz indywidualnymi ustawieniami
  userOverrides?.forEach((up) => {
    permissionsMap[up.permission_code] = up.granted;
  });

  return permissionsMap;
});

/**
 * Sprawdza czy użytkownik ma konkretne uprawnienie
 */
export async function hasPermission(code: PermissionCode | string): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions[code] === true;
}

/**
 * Sprawdza czy użytkownik ma którekolwiek z uprawnień
 */
export async function hasAnyPermission(codes: (PermissionCode | string)[]): Promise<boolean> {
  const permissions = await getUserPermissions();
  return codes.some((code) => permissions[code] === true);
}

/**
 * Sprawdza czy użytkownik ma wszystkie uprawnienia
 */
export async function hasAllPermissions(codes: (PermissionCode | string)[]): Promise<boolean> {
  const permissions = await getUserPermissions();
  return codes.every((code) => permissions[code] === true);
}

/**
 * Sprawdza czy użytkownik może widzieć ceny w module
 */
export async function canViewPrices(module: AppModule): Promise<boolean> {
  const code = `${module}:prices`;
  return hasPermission(code);
}

/**
 * Sprawdza czy użytkownik ma dostęp do modułu
 */
export async function canAccessModule(module: AppModule): Promise<boolean> {
  const code = `${module}:access`;
  return hasPermission(code);
}

/**
 * Sprawdza czy użytkownik może edytować w module
 */
export async function canEditInModule(module: AppModule): Promise<boolean> {
  const code = `${module}:edit`;
  return hasPermission(code);
}

/**
 * Sprawdza czy użytkownik może usuwać w module
 */
export async function canDeleteInModule(module: AppModule): Promise<boolean> {
  const code = `${module}:delete`;
  return hasPermission(code);
}

/**
 * Sprawdza czy użytkownik może tworzyć w module
 */
export async function canCreateInModule(module: AppModule): Promise<boolean> {
  const code = `${module}:create`;
  return hasPermission(code);
}

/**
 * Pobiera listę modułów do których użytkownik ma dostęp
 * Używane do filtrowania Sidebar
 */
export async function getAccessibleModules(): Promise<AppModule[]> {
  const permissions = await getUserPermissions();
  const modules: AppModule[] = [
    'dashboard',
    'orders',
    'inventory',
    'documents',
    'files',
    'time-tracking',
    'reports',
    'tags',
    'users',
  ];

  return modules.filter((module) => permissions[`${module}:access`] === true);
}
