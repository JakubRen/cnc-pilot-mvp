import { Button } from './Button'
import { cn } from '@/lib/utils'

interface BulkAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

interface BulkActionBarProps {
  selectedCount: number
  actions: BulkAction[]
  onDeselectAll: () => void
  className?: string
}

export function BulkActionBar({
  selectedCount,
  actions,
  onDeselectAll,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'bg-card border border-border',
        'rounded-lg shadow-md p-4',
        'animate-slide-in-bottom',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Selected count */}
        <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold text-foreground">
            {selectedCount} zaznaczonych
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon && <span className="mr-1">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>

        {/* Deselect all */}
        <button
          onClick={onDeselectAll}
          className="ml-2 p-2 text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-muted"
          aria-label="Odznacz wszystko"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
