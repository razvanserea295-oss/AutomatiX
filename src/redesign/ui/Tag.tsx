import { useState } from 'react';
import { X } from '@/icons';
import { cn } from '@/lib/cn';

export interface TagProps {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}

export function Tag({ children, onRemove, className }: TagProps) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = () => {
    setRemoving(true);
    window.setTimeout(() => onRemove?.(), 150);
  };

  return (
    <span className={cn('ds-tag', removing && 'ds-tag--removing', className)}>
      {children}
      {onRemove && (
        <button
          type="button"
          className="ds-tag__close inline-flex h-4 w-4 items-center justify-center rounded-sm text-ds-muted hover:text-ds-primary"
          aria-label="Elimină"
          onClick={handleRemove}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export default Tag;
