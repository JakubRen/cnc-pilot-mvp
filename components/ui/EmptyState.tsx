import Link from 'next/link'

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon */}
      <div className="text-6xl mb-4" role="img" aria-label={title}>
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white mb-2 text-center">
        {title}
      </h3>

      {/* Description */}
      <p className="text-slate-400 text-center mb-6 max-w-md leading-relaxed">
        {description}
      </p>

      {/* Action Button (optional) */}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
