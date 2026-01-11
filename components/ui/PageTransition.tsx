'use client';

import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page transition wrapper that adds a smooth fade-in animation
 * when content is mounted. Uses CSS animations for performance.
 */
export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}
