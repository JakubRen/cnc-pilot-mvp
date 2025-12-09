import React from 'react'
import { cn } from '@/lib/utils'
import { FieldError } from 'react-hook-form'

interface FormFieldProps {
  label: string
  error?: FieldError | string
  success?: boolean
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  error,
  success,
  required,
  hint,
  children,
  className,
}: FormFieldProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message
  const hasError = !!errorMessage
  const showSuccess = success && !hasError

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input wrapper with validation states */}
      <div className={cn(
        'relative transition-all duration-200',
        hasError && 'animate-shake'
      )}>
        {/* Clone children and add validation classes */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            const element = child as React.ReactElement<{ className?: string }>
            return React.cloneElement(element, {
              className: cn(
                element.props.className,
                hasError && 'border-red-500 dark:border-red-400 focus:ring-red-500',
                showSuccess && 'border-green-500 dark:border-green-400 focus:ring-green-500'
              ),
            })
          }
          return child
        })}

        {/* Success checkmark */}
        {showSuccess && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        {/* Error icon */}
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Hint text */}
      {hint && !hasError && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}

      {/* Error message */}
      {hasError && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  )
}

interface FormErrorsSummaryProps {
  errors: Record<string, any>
  className?: string
}

export function FormErrorsSummary({ errors, className }: FormErrorsSummaryProps) {
  const errorEntries = Object.entries(errors).filter(([_, value]) => value?.message)

  if (errorEntries.length === 0) return null

  return (
    <div className={cn(
      'p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 animate-shake',
      className
    )}>
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
            Znaleziono {errorEntries.length} {errorEntries.length === 1 ? 'błąd' : 'błędy'}:
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {errorEntries.map(([field, error]: [string, any]) => (
              <li key={field} className="text-sm text-red-700 dark:text-red-300">
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
