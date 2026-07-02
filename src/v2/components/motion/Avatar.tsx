import { useState } from 'react';
import { cn } from '@/v2/lib/cn';

const SIZE = {
  sm: 'text-[length:var(--density-fs-meta)]',
  md: 'text-[length:var(--density-fs-body)]',
  lg: 'text-[length:var(--density-fs-section)]',
} as const;

type Props = {
  src?: string | null;
  alt: string;
  fallback: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export default function Avatar({ src, alt, fallback, className, size = 'md' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        'v2-avatar relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground',
        SIZE[size],
        className,
      )}
      style={{ width: 'var(--density-avatar)', height: 'var(--density-avatar)' }}
    >
      {!showImage && <span aria-hidden>{fallback.slice(0, 2).toUpperCase()}</span>}
      {showImage && (
        <img
          src={src!}
          alt={alt}
          className={cn('h-full w-full object-cover', loaded ? 'opacity-100' : 'opacity-0')}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
