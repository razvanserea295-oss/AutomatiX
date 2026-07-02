/**
 * Responsive Preview Mode
 * Allows developers to preview different device sizes without leaving the app.
 * Similar to Builder.io's responsive preview feature.
 */

import React, { useState, useEffect } from 'react';
import { Maximize2, Smartphone, Tablet, Monitor } from '@/icons';
import { cn } from '@/lib/cn';

export interface ViewportSize {
  id: string;
  label: string;
  width: number;
  height?: number;
  icon: typeof Monitor;
}

// Common breakpoints matching Tailwind defaults
export const VIEWPORT_SIZES: ViewportSize[] = [
  { id: 'responsive', label: 'Responsive', width: 1200, icon: Maximize2 },
  { id: 'desktop', label: 'Desktop', width: 1280, icon: Monitor },
  { id: 'laptop', label: 'Laptop', width: 1024, icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: 768, icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: 375, icon: Smartphone },
  { id: 'iphone-17', label: 'iPhone 17', width: 430, icon: Smartphone },
  { id: 'ipad-pro', label: 'iPad Pro', width: 1024, icon: Tablet },
];

interface ResponsivePreviewState {
  viewport: string;
  setViewport: (v: string) => void;
  isPreviewing: boolean;
  togglePreview: () => void;
}

// Store for responsive preview mode
const ResponsivePreviewContext = React.createContext<ResponsivePreviewState | null>(null);

export function ResponsivePreviewProvider({ children }: { children: React.ReactNode }) {
  const [viewport, setViewport] = useState('responsive');
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Apply viewport constraints via CSS
  useEffect(() => {
    const root = document.documentElement;
    
    if (isPreviewing && viewport !== 'responsive') {
      const size = VIEWPORT_SIZES.find(s => s.id === viewport);
      if (size) {
        root.style.setProperty('--preview-width', `${size.width}px`);
        root.classList.add('responsive-preview');
      }
    } else {
      root.style.removeProperty('--preview-width');
      root.classList.remove('responsive-preview');
    }
    
    return () => {
      root.style.removeProperty('--preview-width');
      root.classList.remove('responsive-preview');
    };
  }, [viewport, isPreviewing]);

  return (
    <ResponsivePreviewContext.Provider value={{
      viewport,
      setViewport,
      isPreviewing,
      togglePreview: () => setIsPreviewing(p => !p),
    }}>
      {children}
    </ResponsivePreviewContext.Provider>
  );
}

export function useResponsivePreview(): ResponsivePreviewState {
  const ctx = React.useContext(ResponsivePreviewContext);
  if (!ctx) {
    return {
      viewport: 'responsive',
      setViewport: () => {},
      isPreviewing: false,
      togglePreview: () => {},
    };
  }
  return ctx;
}

// Compact viewport selector component
export function ViewportSelector({ className }: { className?: string }) {
  const { viewport, setViewport, isPreviewing } = useResponsivePreview();
  
  if (!isPreviewing) return null;
  
  const CurrentIcon = VIEWPORT_SIZES.find(s => s.id === viewport)?.icon || Maximize2;
  
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border border-line bg-surface-secondary', className)}>
      <select
        value={viewport}
        onChange={(e) => setViewport(e.target.value)}
        className="appearance-none bg-surface-secondary border border-line rounded-xl px-3 py-1.5 text-pm-sm font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
        aria-label="Select viewport size"
      >
        {VIEWPORT_SIZES.map((size) => (
          <option key={size.id} value={size.id}>
            {size.label}
          </option>
        ))}
      </select>
      <CurrentIcon className="h-3.5 w-3.5 text-content-muted" />
    </div>
  );
}