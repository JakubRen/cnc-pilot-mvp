'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')

  const value = controlledValue !== undefined ? controlledValue : internalValue
  const handleValueChange = onValueChange || setInternalValue

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 p-1 text-slate-500 dark:text-slate-400',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  children: React.ReactNode
}

export function TabsTrigger({
  value: triggerValue,
  children,
  className,
  ...props
}: TabsTriggerProps) {
  const context = React.useContext(TabsContext)

  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs')
  }

  const isActive = context.value === triggerValue

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(triggerValue)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
          : 'hover:bg-slate-200 dark:hover:bg-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

export function TabsContent({
  value: contentValue,
  children,
  className,
  ...props
}: TabsContentProps) {
  const context = React.useContext(TabsContext)

  if (!context) {
    throw new Error('TabsContent must be used within Tabs')
  }

  if (context.value !== contentValue) {
    return null
  }

  return (
    <div
      className={cn(
        'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
