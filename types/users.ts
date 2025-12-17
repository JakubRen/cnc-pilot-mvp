// ============================================
// types/users.ts
// User entity types and utilities
// ============================================

export type UserRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'operator'
  | 'viewer'
  | 'pending'

export type InterfaceMode = 'kiosk_only' | 'full_access' | 'both'

export interface User {
  id: number
  auth_id: string
  email: string
  full_name: string
  role: UserRole
  company_id: string
  hourly_rate: number | null
  interface_mode: InterfaceMode
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: number
  email: string
  full_name: string
  role: UserRole
  company_id: string
  hourly_rate: number | null
  interface_mode?: InterfaceMode
}

export interface UserFormData {
  email: string
  full_name: string
  role: UserRole
  hourly_rate?: number
  interface_mode?: InterfaceMode
}

export interface UserWithStats extends User {
  stats?: {
    total_time_logs: number
    total_hours_worked: number
    active_orders: number
  }
}

export const roleLabels: Record<UserRole, string> = {
  owner: 'Właściciel',
  admin: 'Administrator',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Przeglądający',
  pending: 'Oczekujący',
}

export const roleColors: Record<UserRole, string> = {
  owner: 'bg-purple-600',
  admin: 'bg-blue-600',
  manager: 'bg-green-600',
  operator: 'bg-yellow-600',
  viewer: 'bg-slate-600',
  pending: 'bg-gray-600',
}

export const roleTextColors: Record<UserRole, string> = {
  owner: 'text-purple-100',
  admin: 'text-blue-100',
  manager: 'text-green-100',
  operator: 'text-yellow-100',
  viewer: 'text-slate-100',
  pending: 'text-gray-100',
}

export const interfaceModeLabels: Record<InterfaceMode, string> = {
  kiosk_only: 'Tylko Kiosk',
  full_access: 'Pełny dostęp',
  both: 'Oba (z przełącznikiem)',
}

export const interfaceModeDescriptions: Record<InterfaceMode, string> = {
  kiosk_only: 'Użytkownik widzi tylko uproszczony widok kioskowy',
  full_access: 'Użytkownik ma pełny dostęp do aplikacji',
  both: 'Użytkownik może przełączać między widokami',
}

/**
 * Role hierarchy for permission checks
 */
export const roleHierarchy: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  operator: 40,
  viewer: 20,
  pending: 0,
}

/**
 * Check if user has permission based on role hierarchy
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Check if user can edit another user
 */
export function canEditUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  // Owner can edit anyone
  if (currentUserRole === 'owner') return true

  // Admin can edit manager and below
  if (currentUserRole === 'admin' && roleHierarchy[targetUserRole] < roleHierarchy.admin) {
    return true
  }

  // Manager can edit operator and viewer
  if (currentUserRole === 'manager' && roleHierarchy[targetUserRole] <= roleHierarchy.operator) {
    return true
  }

  return false
}

/**
 * Check if user can delete another user
 */
export function canDeleteUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  // Only owner can delete users
  return currentUserRole === 'owner'
}

/**
 * Get available roles for a user to assign based on their role
 */
export function getAvailableRoles(currentUserRole: UserRole): UserRole[] {
  if (currentUserRole === 'owner') {
    return ['owner', 'admin', 'manager', 'operator', 'viewer']
  }

  if (currentUserRole === 'admin') {
    return ['manager', 'operator', 'viewer']
  }

  if (currentUserRole === 'manager') {
    return ['operator', 'viewer']
  }

  return []
}

/**
 * Check if user has elevated privileges (owner/admin)
 */
export function hasElevatedPrivileges(userRole: UserRole): boolean {
  return userRole === 'owner' || userRole === 'admin'
}

/**
 * Check if user can access specific module based on role
 */
export function canAccessModule(userRole: UserRole, module: string): boolean {
  const modulePermissions: Record<string, UserRole[]> = {
    dashboard: ['owner', 'admin', 'manager', 'operator', 'viewer'],
    orders: ['owner', 'admin', 'manager', 'operator'],
    inventory: ['owner', 'admin', 'manager', 'operator'],
    'time-tracking': ['owner', 'admin', 'manager', 'operator'],
    users: ['owner', 'admin'],
    settings: ['owner', 'admin'],
    reports: ['owner', 'admin', 'manager'],
  }

  const allowedRoles = modulePermissions[module] || []
  return allowedRoles.includes(userRole)
}
