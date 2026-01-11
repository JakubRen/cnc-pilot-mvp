'use client'

import { Fragment } from 'react'
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon, TrashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { Button } from './Button'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Potwierdź',
  cancelText = 'Anuluj',
  variant = 'danger',
  isLoading = false,
}: ConfirmationDialogProps) {
  const icons = {
    danger: <TrashIcon className="h-6 w-6 text-red-600" />,
    warning: <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />,
    info: <QuestionMarkCircleIcon className="h-6 w-6 text-blue-600" />,
  }

  const iconBg = {
    danger: 'bg-red-100 dark:bg-red-900/30',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30',
    info: 'bg-blue-100 dark:bg-blue-900/30',
  }

  const handleConfirm = async () => {
    await onConfirm()
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 p-3 rounded-full ${iconBg[variant]}`}>
                    {icons[variant]}
                  </div>
                  <div className="flex-1">
                    <HeadlessDialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-slate-900 dark:text-white"
                    >
                      {title}
                    </HeadlessDialog.Title>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    variant={variant === 'danger' ? 'danger' : 'primary'}
                    onClick={handleConfirm}
                    isLoading={isLoading}
                  >
                    {confirmText}
                  </Button>
                </div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  )
}

// Hook for easier usage
import { useState, useCallback } from 'react'

interface UseConfirmationOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<UseConfirmationOptions>({
    title: '',
    description: '',
  })
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: UseConfirmationOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)
    return new Promise((resolve) => {
      setResolveRef(() => resolve)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef?.(true)
    setIsOpen(false)
  }, [resolveRef])

  const handleCancel = useCallback(() => {
    resolveRef?.(false)
    setIsOpen(false)
  }, [resolveRef])

  const ConfirmDialog = useCallback(() => (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      {...options}
    />
  ), [isOpen, options, handleCancel, handleConfirm])

  return { confirm, ConfirmDialog }
}
