import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  
  
  const sizeClasses = {
    sm: 'w-full sm:w-[400px]',
    md: 'w-full sm:w-[520px]',
    lg: 'w-full sm:w-[720px]',
    xl: 'w-full sm:w-[960px]',
  };

  
  
  
  return (
    <aside
      className={cn(
        'absolute right-0 top-0 bottom-0 z-30',
        'bg-surface-secondary border-l border-line/80',
        'shadow-[var(--elevation-3)]',
        'flex flex-col anim-slide-up',
        sizeClasses[size],
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {}
      <span aria-hidden className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />

      {}
      <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-line/70 bg-surface-secondary">
        <h2 id="modal-title" className="text-sm font-semibold text-content-primary truncate tracking-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-smooth duration-150 cursor-pointer focus-ring-soft hover:rotate-90"
          aria-label="Închide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
        {children}
      </div>
    </aside>
  );
}
