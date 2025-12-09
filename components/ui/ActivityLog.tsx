import { cn } from '@/lib/utils'

export interface ActivityItem {
  id: string
  user: {
    name: string
    avatar?: string
  }
  action: string
  details?: string
  timestamp: Date | string
  type?: 'create' | 'update' | 'delete' | 'comment' | 'status'
}

interface ActivityLogProps {
  items: ActivityItem[]
  className?: string
  maxItems?: number
}

const activityIcons = {
  create: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
    </svg>
  ),
  update: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  ),
  delete: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  comment: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
    </svg>
  ),
  status: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  ),
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'przed chwilą'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min temu`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h temu`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} dni temu`
  return then.toLocaleDateString('pl-PL')
}

export function ActivityLog({ items, className, maxItems }: ActivityLogProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items

  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Brak aktywności do wyświetlenia
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {displayItems.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            'relative pl-8 pb-4',
            index !== displayItems.length - 1 && 'border-l-2 border-slate-200 dark:border-slate-700'
          )}
        >
          {/* Icon */}
          <div className="absolute left-0 top-0 -ml-[9px] flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600">
            <div className="text-slate-600 dark:text-slate-400">
              {item.type && activityIcons[item.type]}
            </div>
          </div>

          {/* Content */}
          <div className="glass-panel rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                {item.user.avatar ? (
                  <img
                    src={item.user.avatar}
                    alt={item.user.name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {item.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {item.user.name}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatTimeAgo(item.timestamp)}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {item.action}
            </p>
            {item.details && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {item.details}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
