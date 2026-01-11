import Link from 'next/link';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  link?: string;
}

const colorStyles = {
  blue:   'border-blue-200 dark:border-cyan-500/20 text-blue-600 dark:text-cyan-400 group-hover:border-blue-400 dark:group-hover:border-cyan-400/50 dark:group-hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]',
  green:  'border-green-200 dark:border-emerald-500/20 text-green-600 dark:text-emerald-400 group-hover:border-green-400 dark:group-hover:border-emerald-400/50 dark:group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]',
  red:    'border-red-200 dark:border-rose-500/20 text-red-600 dark:text-rose-400 group-hover:border-red-400 dark:group-hover:border-rose-400/50 dark:group-hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]',
  yellow: 'border-yellow-200 dark:border-amber-500/20 text-yellow-600 dark:text-amber-400 group-hover:border-yellow-400 dark:group-hover:border-amber-400/50 dark:group-hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]',
  purple: 'border-purple-200 dark:border-violet-500/20 text-purple-600 dark:text-violet-400 group-hover:border-purple-400 dark:group-hover:border-violet-400/50 dark:group-hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]',
};

const bgGradients = {
  blue:   'from-blue-50 to-white dark:from-cyan-500/5 dark:to-transparent',
  green:  'from-green-50 to-white dark:from-emerald-500/5 dark:to-transparent',
  red:    'from-red-50 to-white dark:from-rose-500/5 dark:to-transparent',
  yellow: 'from-yellow-50 to-white dark:from-amber-500/5 dark:to-transparent',
  purple: 'from-purple-50 to-white dark:from-violet-500/5 dark:to-transparent',
};

function CardContent({ title, value, icon, subtitle, color = 'blue', link }: MetricCardProps) {
  return (
    <div
      className={`glass-panel group relative overflow-hidden rounded-xl p-6 border transition-all duration-300 min-h-[160px] ${colorStyles[color]} ${link ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : 'shadow-sm'} bg-gradient-to-br ${bgGradients[color]}`}
    >
      <div className="absolute top-0 right-0 p-2 opacity-50 hidden dark:block">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <path d="M0 0H20V20" stroke="currentColor" strokeWidth="1" fill="none"/>
        </svg>
      </div>

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-lg bg-white border border-gray-100 shadow-sm dark:bg-black/30 dark:backdrop-blur-sm dark:border-white/5 dark:shadow-inner`}>
          <span className="text-2xl filter dark:drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{icon}</span>
        </div>
        <h3 className="text-xs font-medium text-slate-500 dark:text-muted-foreground uppercase tracking-widest text-right mt-1 font-mono">
          {title}
        </h3>
      </div>

      <div className="mb-2 relative z-10">
        <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-foreground font-mono tabular-nums">
          {value}
        </p>
      </div>

      {subtitle && (
        <div className="flex items-center gap-2 relative z-10">
           <div className={`h-1 w-1 rounded-full ${color === 'red' ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
           <p className="text-xs text-slate-500 dark:text-muted-foreground font-mono opacity-80">{subtitle}</p>
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
