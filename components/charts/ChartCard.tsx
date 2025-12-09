'use client'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export default function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div className={`glass-panel border border-slate-200 dark:border-border rounded-xl p-6 shadow-sm dark:shadow-none ${className}`}>
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
