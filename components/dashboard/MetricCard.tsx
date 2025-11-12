import Link from 'next/link';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  link?: string;
}

export default function MetricCard({
  title,
  value,
  icon,
  subtitle,
  color = 'blue',
  link,
}: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    yellow: 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
  };

  const CardContent = () => (
    <div
      className={`
        bg-gradient-to-br ${colorClasses[color]}
        rounded-lg p-6 shadow-md
        transition-all duration-200
        ${link ? 'hover:shadow-lg hover:scale-105 cursor-pointer' : ''}
      `}
    >
      {/* Icon and Title */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-4xl">{icon}</span>
        <h3 className="text-sm font-medium text-white/90 text-right">{title}</h3>
      </div>

      {/* Value */}
      <div className="mb-2">
        <p className="text-4xl font-bold text-white">{value}</p>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-white/80">{subtitle}</p>
      )}
    </div>
  );

  if (link) {
    return (
      <Link href={link}>
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
}
