import { useEffect, useRef, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type AvatarStatus = 'online' | 'away' | 'offline';
type AvatarShape = 'circle' | 'rounded';

interface AvatarProps {
  name?: string;
  src?: string;
  alt?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  status?: AvatarStatus;
  tone?: 'accent' | 'green' | 'red' | 'amber' | 'blue' | 'teal' | 'purple' | 'neutral';
  className?: string;
  children?: ReactNode;
}

const sizing: Record<AvatarSize, { status: string }> = {
  xs: { status: 'h-1.5 w-1.5' },
  sm: { status: 'h-2 w-2' },
  md: { status: 'h-2.5 w-2.5' },
  lg: { status: 'h-3 w-3' },
  xl: { status: 'h-3.5 w-3.5' },
  '2xl': { status: 'h-4 w-4' },
};

const palette = ['#4D86FF', '#2dd4bf', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24'] as const;

const toneBg: Record<NonNullable<AvatarProps['tone']>, string> = {
  accent: '#4D86FF',
  green: '#34d399',
  red: '#f87171',
  amber: '#fbbf24',
  blue: '#60a5fa',
  teal: '#2dd4bf',
  purple: '#a78bfa',
  neutral: '#6b7280',
};

function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
}

function AvatarImage({ src, alt, className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (img?.complete) img.style.opacity = '1';
  }, []);

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={className}
      onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
      {...props}
    />
  );
}

export default function Avatar({
  name,
  src,
  alt,
  size = 'md',
  shape = 'circle',
  status,
  tone,
  className = '',
  children,
}: AvatarProps) {
  const bg = tone ? toneBg[tone] : name ? hashColor(name) : toneBg.neutral;

  return (
    <span
      className={cn(
        'ds-avatar',
        `ds-avatar--${size}`,
        shape === 'rounded' && 'ds-avatar--rounded',
        className,
      )}
    >
      {src ? (
        <AvatarImage src={src} alt={alt ?? name ?? 'avatar'} />
      ) : (
        <span className="ds-avatar__initials" style={{ backgroundColor: bg }}>
          {children ?? (name ? getInitials(name) : null)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            'ds-avatar__status',
            sizing[size].status,
            status === 'online' && 'ds-avatar__status--online',
            status === 'away' && 'ds-avatar__status--away',
            status === 'offline' && 'ds-avatar__status--offline',
          )}
          aria-label={status}
        />
      )}
    </span>
  );
}

export interface AvatarGroupProps {
  max?: number;
  size?: AvatarSize;
  children: ReactNode;
  className?: string;
}

export function AvatarGroup({ max = 4, size = 'md', children, className }: AvatarGroupProps) {
  const items = Array.isArray(children) ? children : [children];
  const visible = items.slice(0, max);
  const overflow = items.length - max;

  return (
    <div className={cn('ds-avatar-group', className)}>
      {visible.map((child, i) => (
        <span key={i} className={cn(`ds-avatar--${size}`)}>
          {child}
        </span>
      ))}
      {overflow > 0 && <span className="ds-avatar-group__overflow">+{overflow}</span>}
    </div>
  );
}
