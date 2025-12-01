import { getUserProfile } from '@/lib/auth-server';
import { hasPermission } from '@/lib/permissions-server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AppLayout from '@/components/layout/AppLayout';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const user = await getUserProfile();

  if (!user || !user.company_id) {
    redirect('/login');
  }

  // Only admin/owner can access settings
  if (!['owner', 'admin'].includes(user.role)) {
    redirect('/');
  }

  const supabase = await createClient();

  // Fetch company data
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', user.company_id)
    .single();

  // Fetch company email domains
  const { data: emailDomains } = await supabase
    .from('company_email_domains')
    .select('*')
    .eq('company_id', user.company_id)
    .order('domain', { ascending: true });

  // Check if user can manage permissions
  const canManagePermissions = user.role === 'owner' || await hasPermission('users:permissions');

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Ustawienia Firmy</h1>
          <SettingsClient
            company={company}
            emailDomains={emailDomains || []}
            userRole={user.role}
            canManagePermissions={canManagePermissions}
          />
        </div>
      </div>
    </AppLayout>
  );
}
