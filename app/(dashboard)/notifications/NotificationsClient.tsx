'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Notification } from '@/lib/notifications';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface Props {
  notifications: Notification[];
}

export default function NotificationsClient({ notifications: initialNotifications }: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => !n.read);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notificationId }),
      });

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        toast.success('Oznaczono jako przeczytane');
      } else {
        toast.error('Nie udało się oznaczyć powiadomienia');
      }
    } catch (error) {
      logger.error('Error marking notification as read', { error });
      toast.error('Wystąpił błąd');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      });

      if (response.ok) {
        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        toast.success('Wszystkie powiadomienia oznaczone jako przeczytane');
      } else {
        toast.error('Nie udało się oznaczyć powiadomień');
      }
    } catch (error) {
      logger.error('Error marking all as read', { error });
      toast.error('Wystąpił błąd');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return '🔴';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'error':
        return 'Błąd';
      case 'warning':
        return 'Ostrzeżenie';
      case 'success':
        return 'Sukces';
      default:
        return 'Informacja';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-violet-600 text-white'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              Wszystkie ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'unread'
                  ? 'bg-violet-600 text-white'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              Nieprzeczytane ({unreadCount})
            </button>
          </div>

          {/* Mark All as Read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Oznacz wszystkie jako przeczytane
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <p className="text-muted-foreground">
              {filter === 'unread'
                ? 'Brak nieprzeczytanych powiadomień'
                : 'Brak powiadomień'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-card rounded-lg border transition ${
                notification.read
                  ? 'border-border'
                  : 'border-violet-600/50 bg-violet-50 dark:bg-muted/30'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="text-3xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-foreground font-semibold text-lg">
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              notification.type === 'error'
                                ? 'bg-red-600 text-white'
                                : notification.type === 'warning'
                                ? 'bg-yellow-600 text-white'
                                : notification.type === 'success'
                                ? 'bg-green-600 text-white'
                                : 'bg-violet-600 text-white'
                            }`}
                          >
                            {getTypeLabel(notification.type)}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {new Date(notification.created_at).toLocaleString('pl-PL', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Mark as Read Button */}
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-sm text-violet-400 hover:text-violet-300 transition flex-shrink-0"
                        >
                          Oznacz jako przeczytane
                        </button>
                      )}
                    </div>

                    {/* Message */}
                    {notification.message && (
                      <p className="text-foreground mb-3">{notification.message}</p>
                    )}

                    {/* Link */}
                    {notification.link && (
                      <Link
                        href={notification.link}
                        className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition"
                      >
                        <span>Przejdź do szczegółów</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
