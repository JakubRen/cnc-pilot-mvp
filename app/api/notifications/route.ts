import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth-server';
import { getUnreadNotifications, getAllNotifications, getUnreadCount } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const user = await getUserProfile();

    if (!user || !user.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const rawLimit = parseInt(searchParams.get('limit') || '20');
    const rawOffset = parseInt(searchParams.get('offset') || '0');
    const limit = Math.min(Math.max(1, rawLimit || 20), 100); // min 1, max 100
    const offset = Math.max(0, rawOffset || 0); // min 0

    let notifications;
    let unreadCount = 0;

    if (unreadOnly) {
      notifications = await getUnreadNotifications(user.id, user.company_id);
    } else {
      notifications = await getAllNotifications(user.id, user.company_id, limit, offset);
    }

    unreadCount = await getUnreadCount(user.id, user.company_id);

    return NextResponse.json({
      notifications,
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
