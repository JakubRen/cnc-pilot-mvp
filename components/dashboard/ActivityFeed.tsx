import Link from 'next/link';
import { formatRelativeTime, getActivityIcon, getActivityColor } from '@/lib/dashboard-utils';

interface Activity {
  type: string;
  title: string;
  subtitle: string;
  actor: string;
  timestamp: string;
  href?: string;
}

interface ActivityFeedProps {
  recentActivity: Activity[];
}

export default function ActivityFeed({ recentActivity }: ActivityFeedProps) {
  // DUAL THEME STYLES
  const containerClass = "bg-card rounded-lg p-6 shadow-sm border border-border";
  const headerTextClass = "text-xl font-bold text-foreground";

  if (recentActivity.length === 0) {
    return (
      <div className={containerClass}>
        <h2 className={headerTextClass}>Ostatnie Aktywności</h2>
        <div className="text-center py-8">
          <p className="text-lg font-medium text-muted-foreground">Brak aktywności</p>
          <p className="text-sm text-muted-foreground mt-2">
            Ostatnie akcje pojawią się tutaj
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={headerTextClass}>
          Ostatnie Aktywności
        </h2>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {recentActivity.map((activity, index) => {
          const icon = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type);

          const content = (
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <span className="text-xl">{icon}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${colorClass}`}>
                  {activity.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.subtitle}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {activity.actor}
                  </span>
                  <span className="text-xs text-border">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );

          return activity.href ? (
            <Link
              key={index}
              href={activity.href}
              className="block p-3 bg-muted rounded-md hover:bg-accent transition group"
            >
              {content}
            </Link>
          ) : (
            <div
              key={index}
              className="p-3 bg-muted rounded-md hover:bg-accent transition"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
