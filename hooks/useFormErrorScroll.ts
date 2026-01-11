import { useEffect, useCallback } from 'react'
import type { FieldErrors } from 'react-hook-form'

/**
 * Hook that scrolls to the first form error and adds shake animation
 *
 * Usage:
 * ```tsx
 * const { formState: { errors } } = useForm()
 * useFormErrorScroll(errors)
 * ```
 */
export function useFormErrorScroll<T extends Record<string, unknown>>(
  errors: FieldErrors<T>,
  options: {
    behavior?: ScrollBehavior
    block?: ScrollLogicalPosition
    offset?: number
  } = {}
) {
  const { behavior = 'smooth', block = 'center', offset = -20 } = options

  useEffect(() => {
    const errorKeys = Object.keys(errors)
    if (errorKeys.length === 0) return

    // Find the first error field
    const firstErrorKey = errorKeys[0]

    // Try to find the element by name attribute or data-field attribute
    const errorElement =
      document.querySelector(`[name="${firstErrorKey}"]`) ||
      document.querySelector(`[data-field="${firstErrorKey}"]`) ||
      document.getElementById(firstErrorKey)

    if (errorElement) {
      // Scroll to element
      errorElement.scrollIntoView({ behavior, block })

      // Add shake animation
      errorElement.classList.add('animate-shake')

      // Also highlight the parent form group if exists
      const formGroup = errorElement.closest('.form-group, .space-y-2, .space-y-1')
      if (formGroup) {
        formGroup.classList.add('animate-shake')
      }

      // Remove animation after it completes
      setTimeout(() => {
        errorElement.classList.remove('animate-shake')
        if (formGroup) {
          formGroup.classList.remove('animate-shake')
        }
      }, 500)

      // Focus the element if it's focusable
      if (errorElement instanceof HTMLInputElement ||
          errorElement instanceof HTMLTextAreaElement ||
          errorElement instanceof HTMLSelectElement) {
        errorElement.focus()
      }
    }
  }, [errors, behavior, block, offset])
}

/**
 * Manual scroll to error function (for imperative usage)
 */
export function scrollToFirstError(containerSelector?: string) {
  const container = containerSelector
    ? document.querySelector(containerSelector)
    : document

  if (!container) return

  // Find first error message element
  const errorElement = container.querySelector(
    '.text-red-500, .text-red-600, .text-destructive, [data-error="true"], .error-message'
  )

  if (errorElement) {
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Find associated input
    const formGroup = errorElement.closest('.form-group, .space-y-2, .space-y-1')
    const input = formGroup?.querySelector('input, textarea, select')

    if (input) {
      input.classList.add('animate-shake')
      setTimeout(() => input.classList.remove('animate-shake'), 500)

      if (input instanceof HTMLElement) {
        input.focus()
      }
    }
  }
}
