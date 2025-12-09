import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface EmptyStateProps {
  icon: string | React.ReactNode
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  secondaryActionLabel?: string
  secondaryActionHref?: string
  onSecondaryAction?: () => void
  variant?: 'default' | 'compact'
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  variant = 'default',
  className
}: EmptyStateProps) {
  const isCompact = variant === 'compact'

  return (
    <div className={cn(
      'flex flex-col items-center justify-center px-4 animate-fade-in',
      isCompact ? 'py-8' : 'py-16',
      className
    )}>
      {/* Icon */}
      <div
        className={cn(
          'mb-4 text-slate-400 dark:text-slate-500',
          isCompact ? 'text-4xl' : 'text-6xl'
        )}
        role="img"
        aria-label={title}
      >
        {icon}
      </div>

      {/* Title */}
      <h3 className={cn(
        'font-bold text-slate-900 dark:text-white mb-2 text-center',
        isCompact ? 'text-lg' : 'text-xl'
      )}>
        {title}
      </h3>

      {/* Description */}
      <p className={cn(
        'text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed',
        isCompact ? 'text-sm max-w-xs' : 'text-base max-w-md'
      )}>
        {description}
      </p>

      {/* Action Buttons */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-3">
          {actionLabel && (
            <Button
              href={onAction ? undefined : actionHref}
              onClick={onAction}
              variant="primary"
              size={isCompact ? 'sm' : 'md'}
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && (
            <Button
              href={onSecondaryAction ? undefined : secondaryActionHref}
              onClick={onSecondaryAction}
              variant="outline"
              size={isCompact ? 'sm' : 'md'}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Export EmptyState as named export too
export { EmptyState }

// Preset empty states
export function EmptyOrders({ onAddOrder }: { onAddOrder?: () => void }) {
  return (
    <EmptyState
      icon="📦"
      title="Brak zamówień"
      description="Nie masz jeszcze żadnych zamówień. Dodaj pierwsze zamówienie aby zacząć zarządzać produkcją."
      actionLabel="+ Dodaj zamówienie"
      actionHref="/orders/add"
      onAction={onAddOrder}
      secondaryActionLabel="Dowiedz się więcej"
      secondaryActionHref="/docs/orders"
    />
  )
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="Nie znaleziono wyników"
      description={`Nie znaleziono wyników dla "${query}". Spróbuj zmienić kryteria wyszukiwania.`}
      variant="compact"
    />
  )
}

export function EmptyInventory({ onAddItem }: { onAddItem?: () => void }) {
  return (
    <EmptyState
      icon="📦"
      title="Pusty magazyn"
      description="Twój magazyn jest pusty. Dodaj pierwsze materiały lub narzędzia aby zacząć śledzenie stanów."
      actionLabel="+ Dodaj pozycję"
      actionHref="/inventory/add"
      onAction={onAddItem}
    />
  )
}

export function NoPermission() {
  return (
    <EmptyState
      icon="🔒"
      title="Brak dostępu"
      description="Nie masz uprawnień do przeglądania tej strony. Skontaktuj się z administratorem."
      actionLabel="Wróć do Dashboard"
      actionHref="/"
    />
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="⚠️"
      title="Wystąpił błąd"
      description="Nie udało się załadować danych. Sprawdź połączenie internetowe i spróbuj ponownie."
      actionLabel={onRetry ? 'Spróbuj ponownie' : undefined}
      onAction={onRetry}
    />
  )
}
