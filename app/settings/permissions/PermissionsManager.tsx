// ============================================
// app/settings/permissions/PermissionsManager.tsx
// Client component for managing user permissions
// ============================================

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/hooks/useTranslation';

type InterfaceMode = 'kiosk_only' | 'full_access' | 'both';

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  interface_mode?: InterfaceMode;
}

interface PermissionDef {
  code: string;
  module: string;
  description: string;
}

interface RolePermission {
  role: string;
  permission_code: string;
}

interface UserOverride {
  user_id: number;
  permission_code: string;
  granted: boolean;
}

interface Props {
  users: User[];
  permissionDefs: PermissionDef[];
  rolePermissions: RolePermission[];
  userOverrides: UserOverride[];
}

// Module labels are now provided by translation system

// Role labels in Polish
const ROLE_LABELS: Record<string, string> = {
  owner: 'Właściciel',
  admin: 'Administrator',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Przeglądający',
  pending: 'Oczekujący',
};

// Action labels in Polish
const ACTION_LABELS: Record<string, string> = {
  access: 'Dostęp',
  prices: 'Ceny',
  create: 'Tworzenie',
  edit: 'Edycja',
  delete: 'Usuwanie',
  upload: 'Wysyłanie',
  export: 'Export',
  permissions: 'Uprawnienia',
};

// Interface mode labels in Polish
const INTERFACE_MODE_LABELS: Record<InterfaceMode, string> = {
  kiosk_only: 'Tylko Kiosk',
  full_access: 'Pełny dostęp',
  both: 'Oba (z przełącznikiem)',
};

const INTERFACE_MODE_DESCRIPTIONS: Record<InterfaceMode, string> = {
  kiosk_only: 'Użytkownik widzi tylko uproszczony widok kioskowy',
  full_access: 'Użytkownik ma pełny dostęp do aplikacji',
  both: 'Użytkownik może przełączać między widokami',
};

export default function PermissionsManager({
  users,
  permissionDefs,
  rolePermissions,
  userOverrides,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean | null>>({});
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>('full_access');
  const [saving, setSaving] = useState(false);

  // Helper function to get module label from translation system
  const getModuleLabel = (module: string): string => {
    // Map module keys to translation keys
    const moduleKeyMap: Record<string, string> = {
      'time-tracking': 'timeTracking',
    };
    const translationKey = moduleKeyMap[module] || module;
    return t('nav', translationKey as any) || module;
  };

  // Group permissions by module
  const permissionsByModule = permissionDefs.reduce(
    (acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    },
    {} as Record<string, PermissionDef[]>
  );

  // Get role permissions for a user's role
  const getRolePermissions = (role: string): Set<string> => {
    return new Set(
      rolePermissions
        .filter((rp) => rp.role === role)
        .map((rp) => rp.permission_code)
    );
  };

  // Get user's overrides
  const getUserOverrides = (userId: number): Record<string, boolean> => {
    return userOverrides
      .filter((uo) => uo.user_id === userId)
      .reduce(
        (acc, uo) => {
          acc[uo.permission_code] = uo.granted;
          return acc;
        },
        {} as Record<string, boolean>
      );
  };

  // Handle selecting a user
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    // Load existing overrides for this user
    const existingOverrides = getUserOverrides(user.id);
    setOverrides(existingOverrides);
    // Load interface mode
    setInterfaceMode(user.interface_mode || 'full_access');
  };

  // Handle permission toggle
  const handlePermissionToggle = (code: string) => {
    if (!selectedUser) return;

    const rolePerms = getRolePermissions(selectedUser.role);
    const hasFromRole = rolePerms.has(code);
    const currentOverride = overrides[code];

    // Cycle through: null (use role default) -> opposite of role -> null
    if (currentOverride === undefined || currentOverride === null) {
      // Set override to opposite of role default
      setOverrides({ ...overrides, [code]: !hasFromRole });
    } else {
      // Remove override (use role default)
      const newOverrides = { ...overrides };
      delete newOverrides[code];
      setOverrides(newOverrides);
    }
  };

  // Save overrides and interface mode
  const handleSave = async () => {
    if (!selectedUser) return;

    setSaving(true);
    const loadingToast = toast.loading('Zapisywanie uprawnień...');

    try {
      // Update interface mode for user
      const { error: modeError } = await supabase
        .from('users')
        .update({ interface_mode: interfaceMode })
        .eq('id', selectedUser.id);

      if (modeError) throw modeError;

      // Delete existing overrides for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUser.id);

      // Insert new overrides
      const newOverrides = Object.entries(overrides)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([code, granted]) => ({
          user_id: selectedUser.id,
          permission_code: code,
          granted: granted as boolean,
        }));

      if (newOverrides.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(newOverrides);

        if (error) throw error;
      }

      toast.dismiss(loadingToast);
      toast.success('Uprawnienia zapisane!');
      router.refresh();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Błąd zapisywania uprawnień');
      logger.error('Error saving user permissions', { error });
    } finally {
      setSaving(false);
    }
  };

  // Get effective permission state
  const getPermissionState = (
    code: string
  ): 'granted' | 'denied' | 'role-granted' | 'role-denied' => {
    if (!selectedUser) return 'denied';

    const rolePerms = getRolePermissions(selectedUser.role);
    const hasFromRole = rolePerms.has(code);
    const override = overrides[code];

    if (override === true) return 'granted';
    if (override === false) return 'denied';
    return hasFromRole ? 'role-granted' : 'role-denied';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Users List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Użytkownicy</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={`w-full text-left p-3 rounded-lg transition ${
                selectedUser?.id === user.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <div className="font-medium">{user.full_name}</div>
              <div className="text-sm opacity-70">{user.email}</div>
              <div className="text-xs mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    user.role === 'owner'
                      ? 'bg-purple-600'
                      : user.role === 'admin'
                        ? 'bg-blue-600'
                        : user.role === 'manager'
                          ? 'bg-green-600'
                          : user.role === 'operator'
                            ? 'bg-yellow-600'
                            : 'bg-slate-600'
                  }`}
                >
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Editor */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        {selectedUser ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Uprawnienia: {selectedUser.full_name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Rola: {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving} variant="primary">
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </div>

            {/* Interface Mode Selector */}
            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
              <h3 className="text-slate-900 dark:text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-xl">🖥️</span>
                Tryb interfejsu
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(Object.keys(INTERFACE_MODE_LABELS) as InterfaceMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setInterfaceMode(mode)}
                    className={`p-3 rounded-lg text-left transition border-2 ${
                      interfaceMode === mode
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="font-medium">{INTERFACE_MODE_LABELS[mode]}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {INTERFACE_MODE_DESCRIPTIONS[mode]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600" />
                <span className="text-slate-600 dark:text-slate-300">Nadane (nadpisanie)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-600" />
                <span className="text-slate-600 dark:text-slate-300">Odebrane (nadpisanie)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600/40" />
                <span className="text-slate-600 dark:text-slate-300">Z roli (aktywne)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-600" />
                <span className="text-slate-600 dark:text-slate-300">Z roli (brak)</span>
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                  <h3 className="text-slate-900 dark:text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="text-xl">
                      {module === 'dashboard' && '📊'}
                      {module === 'orders' && '📦'}
                      {module === 'inventory' && '🏭'}
                      {module === 'documents' && '📄'}
                      {module === 'files' && '📁'}
                      {module === 'time-tracking' && '⏱️'}
                      {module === 'reports' && '📈'}
                      {module === 'tags' && '🏷️'}
                      {module === 'users' && '👥'}
                    </span>
                    {getModuleLabel(module)}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {perms.map((perm) => {
                      const state = getPermissionState(perm.code);
                      const action = perm.code.split(':')[1];

                      return (
                        <button
                          key={perm.code}
                          onClick={() => handlePermissionToggle(perm.code)}
                          className={`p-2 rounded-lg text-sm font-medium transition ${
                            state === 'granted'
                              ? 'bg-green-600 text-white'
                              : state === 'denied'
                                ? 'bg-red-600 text-white'
                                : state === 'role-granted'
                                  ? 'bg-green-600/40 text-green-300'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                          title={perm.description}
                        >
                          {ACTION_LABELS[action] || action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg text-sm text-blue-700 dark:text-blue-200">
              <p className="font-semibold mb-1">Jak to działa?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Kliknij uprawnienie aby nadpisać domyślne z roli</li>
                <li>Kliknij ponownie aby usunąć nadpisanie</li>
                <li>Nadpisania mają priorytet nad uprawnieniami z roli</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👈</div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Wybierz użytkownika
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Wybierz użytkownika z listy po lewej, aby zarządzać jego
              uprawnieniami
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
