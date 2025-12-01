'use client';

// ============================================
// PRICE DISPLAY - Wyświetlanie cen z kontrolą uprawnień
// ============================================
import { usePermissions } from '@/hooks/usePermissions';
import type { AppModule } from '@/types/permissions';

interface PriceDisplayProps {
  /** Wartość do wyświetlenia */
  value: number | string | null | undefined;
  /** Moduł do sprawdzenia uprawnień cen */
  module: AppModule;
  /** Format wyświetlania */
  format?: 'currency' | 'number' | 'percent';
  /** Waluta (domyślnie PLN) */
  currency?: string;
  /** Co pokazać gdy brak uprawnień */
  placeholder?: string;
  /** Klasy CSS */
  className?: string;
  /** Dodatkowy prefix */
  prefix?: string;
  /** Dodatkowy suffix */
  suffix?: string;
  /** Miejsca dziesiętne */
  decimals?: number;
}

/**
 * Komponent wyświetlający cenę/koszt z kontrolą uprawnień
 * Automatycznie sprawdza czy użytkownik ma permission `{module}:prices`
 *
 * @example
 * // W tabeli zamówień
 * <PriceDisplay
 *   value={order.total_cost}
 *   module="orders"
 *   className="font-semibold text-green-400"
 * />
 *
 * @example
 * // W dashboard (przychód)
 * <PriceDisplay
 *   value={metrics.revenue}
 *   module="dashboard"
 *   prefix="Przychód: "
 * />
 *
 * @example
 * // Stawka godzinowa
 * <PriceDisplay
 *   value={hourlyRate}
 *   module="time-tracking"
 *   suffix="/h"
 * />
 */
export default function PriceDisplay({
  value,
  module,
  format = 'currency',
  currency = 'PLN',
  placeholder = '---',
  className = '',
  prefix = '',
  suffix = '',
  decimals = 2,
}: PriceDisplayProps) {
  const { canViewPrices, loading } = usePermissions();

  // Podczas ładowania - placeholder
  if (loading) {
    return (
      <span className={`animate-pulse bg-slate-700 rounded inline-block ${className}`}>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      </span>
    );
  }

  // Brak uprawnień - placeholder
  if (!canViewPrices(module)) {
    return <span className={`text-slate-500 ${className}`}>{placeholder}</span>;
  }

  // Brak wartości
  if (value === null || value === undefined || value === '') {
    return <span className={`text-slate-500 ${className}`}>-</span>;
  }

  // Konwertuj na liczbę jeśli string
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    return <span className={`text-slate-500 ${className}`}>-</span>;
  }

  // Formatuj wartość
  let displayValue: string;
  switch (format) {
    case 'currency':
      displayValue = `${numericValue.toFixed(decimals)} ${currency}`;
      break;
    case 'percent':
      displayValue = `${numericValue.toFixed(decimals)}%`;
      break;
    case 'number':
    default:
      displayValue = numericValue.toLocaleString('pl-PL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
  }

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

/**
 * Wersja inline (bez span wrappera)
 */
export function usePriceValue(
  value: number | null | undefined,
  module: AppModule,
  options?: {
    format?: 'currency' | 'number' | 'percent';
    currency?: string;
    placeholder?: string;
    decimals?: number;
  }
): string {
  const { canViewPrices, loading } = usePermissions();

  const {
    format = 'currency',
    currency = 'PLN',
    placeholder = '---',
    decimals = 2,
  } = options || {};

  if (loading || !canViewPrices(module)) {
    return placeholder;
  }

  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  switch (format) {
    case 'currency':
      return `${value.toFixed(decimals)} ${currency}`;
    case 'percent':
      return `${value.toFixed(decimals)}%`;
    default:
      return value.toLocaleString('pl-PL');
  }
}
