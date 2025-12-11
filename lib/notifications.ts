// Notification utilities

import { createClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

export interface Notification {
  id: string;
  user_id: number;
  company_id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

// Get unread notifications for a user
export async function getUnreadNotifications(
  userId: number,
  companyId: string
): Promise<Notification[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    logger.error('Error fetching notifications', { error });
    return [];
  }

  return data || [];
}

// Get all notifications for a user (paginated)
export async function getAllNotifications(
  userId: number,
  companyId: string,
  limit = 20,
  offset = 0
): Promise<Notification[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('Error fetching notifications', { error });
    return [];
  }

  return data || [];
}

// Mark notification as read (with IDOR protection)
export async function markNotificationAsRead(
  notificationId: string,
  userId: number,
  companyId: string
) {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (error) {
    logger.error('Error marking notification as read', { error });
    return false;
  }

  if (count === 0) {
    logger.warn('Notification not found or access denied', { notificationId });
    return false;
  }

  return true;
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(
  userId: number,
  companyId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('read', false);

  if (error) {
    logger.error('Error marking all notifications as read', { error });
    return false;
  }

  return true;
}

// Create a notification
export async function createNotification(
  userId: number,
  companyId: string,
  type: 'info' | 'warning' | 'error' | 'success',
  title: string,
  message?: string,
  link?: string
) {
  const supabase = await createClient();

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    company_id: companyId,
    type,
    title,
    message: message || null,
    link: link || null,
  });

  if (error) {
    logger.error('Error creating notification', { error });
    return false;
  }

  return true;
}

// Get unread count
export async function getUnreadCount(
  userId: number,
  companyId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('read', false);

  if (error) {
    logger.error('Error getting unread count', { error });
    return 0;
  }

  return count || 0;
}
