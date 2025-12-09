import toast, { Toast as ToastType } from 'react-hot-toast'

// Icons for different toast types
const ToastIcons = {
  success: (
    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  loading: (
    <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  ),
}

interface ToastOptions {
  duration?: number
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

// Custom toast renderer
function renderToast(
  message: string,
  type: keyof typeof ToastIcons,
  options?: ToastOptions
) {
  return (t: ToastType) => (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full glass-panel border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg pointer-events-auto flex items-center gap-3 p-4`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {options?.icon || ToastIcons[type]}
      </div>

      {/* Message */}
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {message}
        </p>
      </div>

      {/* Action button (e.g., Undo) */}
      {options?.action && (
        <button
          onClick={() => {
            options.action!.onClick()
            toast.dismiss(t.id)
          }}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold transition"
        >
          {options.action.label}
        </button>
      )}

      {/* Close button */}
      <button
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}

// Enhanced toast helpers
export const customToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.custom(renderToast(message, 'success', options), {
      duration: options?.duration || 3000,
    })
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.custom(renderToast(message, 'error', options), {
      duration: options?.duration || 4000,
    })
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast.custom(renderToast(message, 'warning', options), {
      duration: options?.duration || 3500,
    })
  },

  info: (message: string, options?: ToastOptions) => {
    return toast.custom(renderToast(message, 'info', options), {
      duration: options?.duration || 3000,
    })
  },

  loading: (message: string, options?: Omit<ToastOptions, 'action'>) => {
    return toast.custom(renderToast(message, 'loading', options), {
      duration: Infinity,
    })
  },

  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    },
    options?: ToastOptions
  ) => {
    const loadingToast = customToast.loading(messages.loading, options)

    try {
      const data = await promise
      toast.dismiss(loadingToast)
      customToast.success(
        typeof messages.success === 'function'
          ? messages.success(data)
          : messages.success,
        options
      )
      return data
    } catch (error) {
      toast.dismiss(loadingToast)
      customToast.error(
        typeof messages.error === 'function'
          ? messages.error(error as Error)
          : messages.error,
        options
      )
      throw error
    }
  },

  // Toast with undo action
  withUndo: (
    message: string,
    onUndo: () => void,
    options?: Omit<ToastOptions, 'action'>
  ) => {
    return customToast.success(message, {
      ...options,
      duration: 5000, // Longer duration for undo
      action: {
        label: 'Cofnij',
        onClick: onUndo,
      },
    })
  },
}

// CSS for animations (add to globals.css if not present)
export const toastAnimations = `
@keyframes enter {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes leave {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

.animate-enter {
  animation: enter 0.3s ease-out;
}

.animate-leave {
  animation: leave 0.2s ease-in forwards;
}
`
