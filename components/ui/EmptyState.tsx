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
          'mb-4 text-muted-foreground',
          isCompact ? 'text-4xl' : 'text-6xl'
        )}
        role="img"
        aria-label={title}
      >
        {icon}
      </div>

      {/* Title */}
      <h3 className={cn(
        'font-bold text-foreground mb-2 text-center',
        isCompact ? 'text-lg' : 'text-xl'
      )}>
        {title}
      </h3>

      {/* Description */}
      <p className={cn(
        'text-muted-foreground text-center mb-6 leading-relaxed',
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

export function EmptyProducts() {
  return (
    <EmptyState
      icon="📦"
      title="Brak towarów w katalogu"
      description="Dodaj pierwszy produkt do katalogu, aby móc śledzić stany magazynowe."
      actionLabel="+ Dodaj towar"
      actionHref="/products/add"
    />
  )
}

export function EmptyInventoryLocations() {
  return (
    <EmptyState
      icon="📊"
      title="Brak stanów w magazynie"
      description="Dodaj towary do katalogu i przypisz im lokalizacje w magazynie."
      actionLabel="Przejdź do Katalogu"
      actionHref="/products"
    />
  )
}

export function EmptyTimeLogs() {
  return (
    <EmptyState
      icon="⏱️"
      title="Brak rejestracji czasu"
      description="Rozpocznij śledzenie czasu pracy przy zamówieniach."
      actionLabel="Rozpocznij timer"
      actionHref="/time-tracking/add"
    />
  )
}

export function EmptyUrgentTasks() {
  return (
    <EmptyState
      icon="🎉"
      title="Wszystko pod kontrolą!"
      description="Nie masz pilnych zadań. Świetna robota!"
      variant="compact"
    />
  )
}

export function EmptyNoResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="Brak wyników"
      description={query ? `Nie znaleziono elementów dla "${query}". Spróbuj zmienić kryteria wyszukiwania.` : "Nie znaleziono elementów pasujących do filtrów. Spróbuj zmienić kryteria wyszukiwania."}
      variant="compact"
    />
  )
}

export function EmptyDocuments() {
  return (
    <EmptyState
      icon="📄"
      title="Brak dokumentów magazynowych"
      description="Nie masz jeszcze żadnych dokumentów PW/RW/WZ..."
      actionLabel="+ Nowy dokument"
      actionHref="/documents/add"
    />
  )
}

export function EmptyFiles() {
  return (
    <EmptyState
      icon="📁"
      title="Brak plików"
      description="Prześlij pierwszy plik używając formularza powyżej."
      variant="compact"
    />
  )
}

export function EmptyMachines() {
  return (
    <EmptyState
      icon="🏭"
      title="Brak maszyn"
      description="Dodaj maszyny CNC do systemu, aby śledzić ich stan i konserwację."
      actionLabel="+ Dodaj maszynę"
      actionHref="/machines/add"
    />
  )
}

export function EmptyCustomers() {
  return (
    <EmptyState
      icon="👥"
      title="Brak kontrahentów"
      description="Dodaj pierwszego kontrahenta, aby móc tworzyć oferty i zamówienia."
      actionLabel="+ Dodaj kontrahenta"
      actionHref="/customers/add"
    />
  )
}

export function EmptyQuotes() {
  return (
    <EmptyState
      icon="💰"
      title="Brak ofert"
      description="Nie masz jeszcze żadnych ofert. Utwórz pierwszą ofertę dla klienta."
      actionLabel="+ Utwórz ofertę"
      actionHref="/quotes/add"
    />
  )
}

export function EmptyProductionPlans() {
  return (
    <EmptyState
      icon="🔧"
      title="Brak planów produkcji"
      description="Nie masz jeszcze planów produkcji. Utwórz plan dla zamówienia."
      actionLabel="Zobacz zamówienia"
      actionHref="/orders"
    />
  )
}

// Centralized EMPTY_STATES object for consistent usage
export const EMPTY_STATES = {
  orders: EmptyOrders,
  products: EmptyProducts,
  inventory: EmptyInventory,
  inventoryLocations: EmptyInventoryLocations,
  timeLogs: EmptyTimeLogs,
  urgentTasks: EmptyUrgentTasks,
  noResults: EmptyNoResults,
  search: EmptySearch,
  documents: EmptyDocuments,
  files: EmptyFiles,
  machines: EmptyMachines,
  customers: EmptyCustomers,
  quotes: EmptyQuotes,
  productionPlans: EmptyProductionPlans,
  noPermission: NoPermission,
  error: ErrorState,
} as const
