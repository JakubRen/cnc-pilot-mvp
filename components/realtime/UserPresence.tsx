'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface PresenceUser {
  user_id: number;
  online_at: string;
  // Add other properties if available in presence state
}

interface UserPresenceProps {
  companyId: string
  userId: number
}

export default function UserPresence({ companyId, userId }: UserPresenceProps) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    const channel = supabase.channel(`company:${companyId}:presence`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as { [key: string]: PresenceUser[] };
        const users = Object.values(state).flat();
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        logger.debug('User joined', { newPresences })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        logger.debug('User left', { leftPresences })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [companyId, userId])

  if (onlineUsers.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
        Online ({onlineUsers.length})
      </h3>
      <div className="space-y-1">
        {onlineUsers.map((user, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              User {user.user_id}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
