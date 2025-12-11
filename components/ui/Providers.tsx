'use client';

import { ReactNode } from 'react';
import { TranslationProvider } from '@/hooks/useTranslation';
import { PermissionsProvider } from '@/hooks/usePermissions';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ErrorBoundary } from './ErrorBoundary';
import type { UserPermissionsMap } from '@/types/permissions';

interface ProvidersProps {
  children: ReactNode;
  initialPermissions?: UserPermissionsMap;
}

export function Providers({ children, initialPermissions }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TranslationProvider>
          <PermissionsProvider initialPermissions={initialPermissions}>
            {children}
          </PermissionsProvider>
        </TranslationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
