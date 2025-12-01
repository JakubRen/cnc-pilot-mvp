// ============================================
// TYPY DLA SYSTEMU UPRAWNIEŃ - CNC-Pilot
// ============================================

/**
 * Moduły aplikacji
 */
export type AppModule =
  | 'dashboard'
  | 'orders'
  | 'inventory'
  | 'documents'
  | 'files'
  | 'time-tracking'
  | 'reports'
  | 'tags'
  | 'users';

/**
 * Akcje/operacje
 */
export type PermissionAction =
  | 'access'      // Dostęp do modułu
  | 'prices'      // Widok cen/kosztów
  | 'create'      // Tworzenie
  | 'edit'        // Edycja
  | 'delete'      // Usuwanie
  | 'upload'      // Upload plików
  | 'export'      // Eksport danych
  | 'permissions'; // Zarządzanie uprawnieniami

/**
 * Kod uprawnienia (format: module:action)
 */
export type PermissionCode = `${AppModule}:${PermissionAction}`;

/**
 * Definicja uprawnienia (z bazy)
 */
export interface PermissionDefinition {
  id: string;
  code: string;
  module: AppModule;
  action: PermissionAction;
  name_pl: string;
  description_pl: string | null;
  created_at: string;
}

/**
 * Uprawnienie przypisane do roli (z bazy)
 */
export interface RolePermission {
  id: string;
  role: string;
  permission_code: string;
  created_at: string;
}

/**
 * Nadpisanie uprawnienia dla użytkownika (z bazy)
 */
export interface UserPermission {
  id: string;
  user_id: number;
  permission_code: string;
  granted: boolean;
  granted_by: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Mapa uprawnień użytkownika (szybki lookup)
 * Klucz: permission_code, Wartość: czy ma uprawnienie
 */
export type UserPermissionsMap = Record<string, boolean>;

/**
 * Kontekst uprawnień (dla Provider/Hook)
 */
export interface PermissionsContextType {
  /** Mapa wszystkich uprawnień użytkownika */
  permissions: UserPermissionsMap;
  /** Czy trwa ładowanie */
  loading: boolean;
  /** Sprawdź konkretne uprawnienie */
  hasPermission: (code: PermissionCode | string) => boolean;
  /** Sprawdź czy ma którekolwiek z uprawnień */
  hasAnyPermission: (codes: (PermissionCode | string)[]) => boolean;
  /** Sprawdź czy ma wszystkie uprawnienia */
  hasAllPermissions: (codes: (PermissionCode | string)[]) => boolean;
  /** Czy może widzieć ceny w module */
  canViewPrices: (module: AppModule) => boolean;
  /** Czy ma dostęp do modułu */
  canAccess: (module: AppModule) => boolean;
  /** Czy może edytować w module */
  canEdit: (module: AppModule) => boolean;
  /** Czy może usuwać w module */
  canDelete: (module: AppModule) => boolean;
  /** Czy może tworzyć w module */
  canCreate: (module: AppModule) => boolean;
  /** Odśwież uprawnienia */
  refresh: () => Promise<void>;
}

/**
 * Mapowanie ścieżek URL na moduły
 */
export const PATH_TO_MODULE: Record<string, AppModule> = {
  '/': 'dashboard',
  '/orders': 'orders',
  '/inventory': 'inventory',
  '/documents': 'documents',
  '/files': 'files',
  '/time-tracking': 'time-tracking',
  '/reports': 'reports',
  '/tags': 'tags',
  '/users': 'users',
};

/**
 * Kolejność modułów w nawigacji
 */
export const MODULE_ORDER: AppModule[] = [
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
