import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string | HeroIcon;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  link?: string;
}

const colorAccent = {
  blue:   'text-primary',
  green:  'text-green-600 dark:text-green-400',
  red:    'text-red-600 dark:text-red-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

const iconBg = {
  blue:   'bg-violet-50 dark:bg-violet-500/10',
  green:  'bg-green-50 dark:bg-green-500/10',
  red:    'bg-red-50 dark:bg-red-500/10',
  yellow: 'bg-yellow-50 dark:bg-yellow-500/10',
  purple: 'bg-purple-50 dark:bg-purple-500/10',
};

function CardContent({ title, value, icon: Icon, subtitle, color = 'blue', link }: MetricCardProps) {
  const isComponent = typeof Icon !== 'string';

  return (
    <div
      className={`bg-card rounded-lg p-6 border border-border transition-colors min-h-[160px] ${link ? 'cursor-pointer hover:bg-muted' : ''} shadow-sm`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${iconBg[color]}`}>
          {isComponent ? (
            <Icon className={`w-6 h-6 ${colorAccent[color]}`} />
          ) : (
            <span className="text-2xl">{Icon}</span>
          )}
        </div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest text-right mt-1 font-mono">
          {title}
        </h3>
      </div>

      <div className="mb-2">
        <p className="text-4xl font-bold tracking-tight text-foreground font-mono tabular-nums">
          {value}
        </p>
      </div>

      {subtitle && (
        <div className="flex items-center gap-2">
           <div className={`h-1 w-1 rounded-full ${color === 'red' ? 'bg-red-500' : 'bg-green-500'}`}></div>
           <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>
        </div>
      )}
    </div>
  );
}

export default function MetricCard(props: MetricCardProps) {
  if (props.link) {
    return (
      <Link href={props.link}>
        <CardContent {...props} />
      </Link>
    );
  }

  return <CardContent {...props} />;
}
