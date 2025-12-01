'use client';

// ============================================
// PERMISSION GUARD - Warunkowy render
// ============================================
import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { PermissionCode, AppModule } from '@/types/permissions';

interface PermissionGuardProps {
  children: ReactNode;
  /** Konkretne uprawnienie do sprawdzenia */
  permission?: PermissionCode | string;
  /** Sprawdź dostęp do modułu */
  module?: AppModule;
  /** Sprawdź czy może widzieć ceny w module */
  prices?: AppModule;
  /** Sprawdź czy może edytować w module */
  edit?: AppModule;
  /** Sprawdź czy może usuwać w module */
  delete_?: AppModule;
  /** Sprawdź czy może tworzyć w module */
  create?: AppModule;
  /** Wiele uprawnień do sprawdzenia */
  permissions?: (PermissionCode | string)[];
  /** Tryb sprawdzania wielu: 'any' = jedno z wielu, 'all' = wszystkie */
  mode?: 'any' | 'all';
  /** Co pokazać gdy brak uprawnień */
  fallback?: ReactNode;
  /** Czy pokazać loading state */
  showLoading?: boolean;
}

/**
 * Komponent warunkowego renderowania na podstawie uprawnień
 *
 * @example
 * // Sprawdź konkretne uprawnienie
 * <PermissionGuard permission="orders:prices">
 *   <span>{order.total_cost} PLN</span>
 * </PermissionGuard>
 *
 * @example
 * // Sprawdź dostęp do modułu
 * <PermissionGuard module="reports">
 *   <ReportsSection />
 * </PermissionGuard>
 *
 * @example
 * // Sprawdź widoczność cen
 * <PermissionGuard prices="orders">
 *   <PriceColumn value={order.total_cost} />
 * </PermissionGuard>
 *
 * @example
 * // Z fallback
 * <PermissionGuard permission="users:delete" fallback={<span>Brak uprawnień</span>}>
 *   <DeleteButton />
 * </PermissionGuard>
 */
export default function PermissionGuard({
  children,
  permission,
  module,
  prices,
  edit,
  delete_,
  create,
  permissions = [],
  mode = 'any',
  fallback = null,
  showLoading = false,
}: PermissionGuardProps) {
  const {
    hasPermission,
    canAccess,
    canViewPrices,
    canEdit,
    canDelete,
    canCreate,
    hasAnyPermission,
    hasAllPermissions,
    loading,
  } = usePermissions();

  // Podczas ładowania
  if (loading && showLoading) {
    return <span className="animate-pulse bg-slate-700 rounded h-4 w-16 inline-block" />;
  }

  if (loading) {
    // Podczas loading - pokaż children (zakładamy że user MA uprawnienia)
    // To zapobiega miganiu - element jest widoczny od razu
    return <>{children}</>;
  }

  let allowed = false;

  // Sprawdź konkretne uprawnienie
  if (permission) {
    allowed = hasPermission(permission);
  }
  // Sprawdź dostęp do modułu
  else if (module) {
    allowed = canAccess(module);
  }
  // Sprawdź widoczność cen
  else if (prices) {
    allowed = canViewPrices(prices);
  }
  // Sprawdź edycję
  else if (edit) {
    allowed = canEdit(edit);
  }
  // Sprawdź usuwanie
  else if (delete_) {
    allowed = canDelete(delete_);
  }
  // Sprawdź tworzenie
  else if (create) {
    allowed = canCreate(create);
  }
  // Sprawdź wiele uprawnień
  else if (permissions.length > 0) {
    allowed = mode === 'any' ? hasAnyPermission(permissions) : hasAllPermissions(permissions);
  }
  // Domyślnie: brak warunku = pokaż
  else {
    allowed = true;
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
