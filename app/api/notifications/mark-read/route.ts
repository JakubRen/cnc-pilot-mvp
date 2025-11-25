import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth-server';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const user = await getUserProfile();

    if (!user || !user.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_id, mark_all } = body;

    let success = false;

    if (mark_all) {
      success = await markAllNotificationsAsRead(user.id, user.company_id);
    } else if (notification_id) {
      success = await markNotificationAsRead(notification_id, user.id, user.company_id);
    } else {
      return NextResponse.json(
        { error: 'Either notification_id or mark_all must be provided' },
        { status: 400 }
      );
    }

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to mark notification as read' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in mark-read API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
