'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface UseAsyncActionOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
  successMessage?: string
  errorMessage?: string
  showLoadingToast?: boolean
  logErrors?: boolean
}

interface UseAsyncActionResult<T> {
  execute: () => Promise<T | undefined>
  isLoading: boolean
  error: Error | null
  reset: () => void
}

/**
 * Hook for consistent async action handling with loading states, error handling, and toast notifications
 *
 * @example
 * const { execute: deleteOrder, isLoading } = useAsyncAction(
 *   () => orderService.deleteOrder(orderId),
 *   {
 *     successMessage: 'Zamówienie usunięte',
 *     errorMessage: 'Nie udało się usunąć zamówienia',
 *     onSuccess: () => router.push('/orders')
 *   }
 * )
 */
export function useAsyncAction<T = void>(
  action: () => Promise<T>,
  options: UseAsyncActionOptions = {}
): UseAsyncActionResult<T> {
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    showLoadingToast = true,
    logErrors = true,
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (): Promise<T | undefined> => {
    setIsLoading(true)
    setError(null)

    let loadingToast: string | undefined

    if (showLoadingToast) {
      loadingToast = toast.loading('Proszę czekać...')
    }

    try {
      const result = await action()

      if (loadingToast) {
        toast.dismiss(loadingToast)
      }

      if (successMessage) {
        toast.success(successMessage)
      }

      onSuccess?.()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Nieznany błąd')

      if (logErrors) {
        logger.error('Async action failed', {
          message: error.message,
          stack: error.stack,
        })
      }

      if (loadingToast) {
        toast.dismiss(loadingToast)
      }

      const displayMessage = errorMessage || `Błąd: ${error.message}`
      toast.error(displayMessage)

      setError(error)
      onError?.(error)

      throw error
    } finally {
      setIsLoading(false)
    }
  }, [action, onSuccess, onError, successMessage, errorMessage, showLoadingToast, logErrors])

  const reset = useCallback(() => {
    setError(null)
    setIsLoading(false)
  }, [])

  return { execute, isLoading, error, reset }
}

/**
 * Variant for actions that don't need return values (e.g., delete, update)
 */
export function useAsyncMutation(
  action: () => Promise<void>,
  options: UseAsyncActionOptions = {}
) {
  return useAsyncAction(action, options)
}

/**
 * Variant for form submissions with FormData
 */
export function useFormSubmit<T = void>(
  submitFn: (data: FormData) => Promise<T>,
  options: UseAsyncActionOptions = {}
) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<T | undefined> => {
      e.preventDefault()
      setIsSubmitting(true)
      setError(null)

      const formData = new FormData(e.currentTarget)
      let loadingToast: string | undefined

      if (options.showLoadingToast !== false) {
        loadingToast = toast.loading('Wysyłanie...')
      }

      try {
        const result = await submitFn(formData)

        if (loadingToast) {
          toast.dismiss(loadingToast)
        }

        if (options.successMessage) {
          toast.success(options.successMessage)
        }

        options.onSuccess?.()
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Nieznany błąd')

        if (options.logErrors !== false) {
          logger.error('Form submission failed', {
            message: error.message,
            stack: error.stack,
          })
        }

        if (loadingToast) {
          toast.dismiss(loadingToast)
        }

        const displayMessage = options.errorMessage || `Błąd: ${error.message}`
        toast.error(displayMessage)

        setError(error)
        options.onError?.(error)

        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [submitFn, options]
  )

  const reset = useCallback(() => {
    setError(null)
    setIsSubmitting(false)
  }, [])

  return { handleSubmit, isSubmitting, error, reset }
}
