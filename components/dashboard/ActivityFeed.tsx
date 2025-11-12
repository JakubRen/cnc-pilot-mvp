import { formatRelativeTime, getActivityIcon, getActivityColor } from '@/lib/dashboard-utils';

interface Activity {
  type: string;
  title: string;
  subtitle: string;
  actor: string;
  timestamp: string;
}

interface ActivityFeedProps {
  recentActivity: Activity[];
}

export default function ActivityFeed({ recentActivity }: ActivityFeedProps) {
  if (recentActivity.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">📰 Ostatnie Aktywności</h2>
        <div className="text-center py-8">
          <p className="text-4xl mb-4">🕐</p>
          <p className="text-lg font-medium text-slate-400">Brak aktywności</p>
          <p className="text-sm text-slate-500 mt-2">
            Ostatnie akcje pojawią się tutaj
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          📰 Ostatnie Aktywności
        </h2>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {recentActivity.map((activity, index) => {
          const icon = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type);

          return (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-md hover:bg-slate-700 transition"
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <span className="text-xl">{icon}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${colorClass}`}>
                  {activity.title}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {activity.subtitle}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">
                    {activity.actor}
                  </span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs text-slate-500">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
