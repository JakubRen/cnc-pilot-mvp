'use client';

import { ReactNode } from 'react';
import { TranslationProvider } from '@/hooks/useTranslation';
import { PermissionsProvider } from '@/hooks/usePermissions';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { UserProfileProvider } from '@/hooks/UserProfileProvider';
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
        <UserProfileProvider>
          <TranslationProvider>
            <PermissionsProvider initialPermissions={initialPermissions}>
              {children}
            </PermissionsProvider>
          </TranslationProvider>
        </UserProfileProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
