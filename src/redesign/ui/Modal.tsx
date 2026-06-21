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
        'surface-glass-strong border-l border-line/60',
        'rounded-l-2xl shadow-[var(--elevation-4)]',
        'flex flex-col anim-slide-in-right',
        sizeClasses[size],
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {}
      <div className="shrink-0 flex items-center justify-between gap-3 px-5 h-14 border-b border-line/70">
        <h2 id="modal-title" className="min-w-0 flex-1 text-pm-md font-semibold text-content-primary truncate">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex shrink-0 items-center justify-center p-2 rounded-xl text-content-muted hover:bg-surface-tertiary hover:text-content-primary active:scale-95 transition-smooth duration-150 cursor-pointer focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] hover:rotate-90"
          aria-label="Închide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5">
        {children}
      </div>
    </aside>
  );
}
