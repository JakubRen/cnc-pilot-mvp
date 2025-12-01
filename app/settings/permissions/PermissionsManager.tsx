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

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
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

// Module labels in Polish
const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Zamówienia',
  inventory: 'Magazyn',
  documents: 'Dokumenty',
  files: 'Pliki',
  'time-tracking': 'Czas pracy',
  reports: 'Raporty',
  tags: 'Tagi',
  users: 'Użytkownicy',
};

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

export default function PermissionsManager({
  users,
  permissionDefs,
  rolePermissions,
  userOverrides,
}: Props) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean | null>>({});
  const [saving, setSaving] = useState(false);

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

  // Save overrides
  const handleSave = async () => {
    if (!selectedUser) return;

    setSaving(true);
    const loadingToast = toast.loading('Zapisywanie uprawnień...');

    try {
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
      console.error(error);
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
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Użytkownicy</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={`w-full text-left p-3 rounded-lg transition ${
                selectedUser?.id === user.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
      <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700 p-4">
        {selectedUser ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Uprawnienia: {selectedUser.full_name}
                </h2>
                <p className="text-sm text-slate-400">
                  Rola: {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving} variant="primary">
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600" />
                <span className="text-slate-300">Nadane (nadpisanie)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-600" />
                <span className="text-slate-300">Odebrane (nadpisanie)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600/40" />
                <span className="text-slate-300">Z roli (aktywne)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-600" />
                <span className="text-slate-300">Z roli (brak)</span>
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
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
                    {MODULE_LABELS[module] || module}
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
                                  : 'bg-slate-700 text-slate-400'
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
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg text-sm text-blue-200">
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
            <h3 className="text-xl font-semibold text-white mb-2">
              Wybierz użytkownika
            </h3>
            <p className="text-slate-400">
              Wybierz użytkownika z listy po lewej, aby zarządzać jego
              uprawnieniami
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
