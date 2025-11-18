import { getUserProfile } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getAllNotifications } from '@/lib/notifications';
import AppLayout from '@/components/layout/AppLayout';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  const user = await getUserProfile();

  if (!user || !user.company_id) {
    redirect('/login');
  }

  const notifications = await getAllNotifications(user.id, user.company_id, 50);

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Powiadomienia</h1>
          <NotificationsClient notifications={notifications} />
        </div>
      </div>
    </AppLayout>
  );
}
