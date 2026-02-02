'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error', { error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="bg-card rounded-lg p-8 max-w-lg w-full border border-border shadow-md text-center">
            <div className="text-6xl mb-4 text-muted-foreground">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Coś poszło nie tak
            </h1>
            <p className="text-muted-foreground mb-6">
              Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę lub wróć do strony głównej.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs text-red-800 dark:text-red-300 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition font-medium"
              >
                Odśwież stronę
              </button>
              <Link
                href="/"
                className="px-6 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition font-medium"
              >
                Strona główna
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
