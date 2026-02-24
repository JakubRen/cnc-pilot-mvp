import { getUserProfile } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const user = await getUserProfile();

  if (!user || !user.company_id) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Get full user data including auth email
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const userData = {
    ...user,
    auth_email: authUser?.email || user.email,
  };

  return (
<div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Mój Profil</h1>
        <ProfileClient user={userData} />
      </div>
    </div>
);
}
