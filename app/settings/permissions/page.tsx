// ============================================
// app/settings/permissions/page.tsx
// Permissions management page - Server Component
// ============================================

import { getUserProfile } from '@/lib/auth-server';
import { hasPermission } from '@/lib/permissions-server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AppLayout from '@/components/layout/AppLayout';
import PermissionsManager from './PermissionsManager';

export const metadata = {
  title: 'Uprawnienia | CNC-Pilot',
  description: 'Zarządzanie uprawnieniami użytkowników',
};

export default async function PermissionsPage() {
  const user = await getUserProfile();

  if (!user || !user.company_id) {
    redirect('/login');
  }

  // Check if user can manage permissions (owner always can, or users with users:permissions)
  const canManagePermissions = user.role === 'owner' || await hasPermission('users:permissions');
  if (!canManagePermissions) {
    redirect('/');
  }

  const supabase = await createClient();

  // Fetch all users in the company
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, role, interface_mode')
    .eq('company_id', user.company_id)
    .order('full_name', { ascending: true });

  // Fetch all permission definitions
  const { data: permissionDefs } = await supabase
    .from('permission_definitions')
    .select('*')
    .order('module', { ascending: true });

  // Fetch role permissions
  const { data: rolePermissions } = await supabase
    .from('role_permissions')
    .select('*');

  // Fetch user-specific permission overrides for this company's users
  const userIds = (users || []).map((u) => u.id);
  const { data: userOverrides } = await supabase
    .from('user_permissions')
    .select('*')
    .in('user_id', userIds.length > 0 ? userIds : [0]);

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Uprawnienia</h1>
            <p className="text-slate-400">
              Zarządzaj uprawnieniami użytkowników w Twojej firmie
            </p>
          </div>

          <PermissionsManager
            users={users || []}
            permissionDefs={permissionDefs || []}
            rolePermissions={rolePermissions || []}
            userOverrides={userOverrides || []}
          />
        </div>
      </div>
    </AppLayout>
  );
}
