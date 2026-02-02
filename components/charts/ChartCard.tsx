'use client'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export default function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-card border border-border rounded-lg p-6 shadow-sm ${className}`}>
      <div className="mb-4">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
