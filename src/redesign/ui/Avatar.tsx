













import type { ReactNode } from 'react';

interface AvatarProps {
  name?: string;
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  online?: boolean;
  
  tone?: 'accent' | 'green' | 'red' | 'amber' | 'blue' | 'teal' | 'purple' | 'neutral';
  className?: string;
  children?: ReactNode;
}

const sizing = {
  xs: { box: 'h-5 w-5',  text: 'text-[9px]',  dot: 'h-1.5 w-1.5 ring-1' },
  sm: { box: 'h-6 w-6',  text: 'text-pm-2xs', dot: 'h-2 w-2 ring-1' },
  md: { box: 'h-8 w-8',  text: 'text-pm-xs',  dot: 'h-2.5 w-2.5 ring-2' },
  lg: { box: 'h-10 w-10', text: 'text-pm-sm', dot: 'h-3 w-3 ring-2' },
  xl: { box: 'h-12 w-12', text: 'text-pm-md', dot: 'h-3 w-3 ring-2' },
};

const palette = ['accent', 'teal', 'purple', 'blue', 'green', 'amber'] as const;
type PaletteKey = typeof palette[number];


const toneClasses: Record<NonNullable<AvatarProps['tone']>, string> = {
  accent:  'bg-accent-muted text-accent ring-accent/20',
  green:   'bg-status-green/15 text-status-green ring-status-green/20',
  red:     'bg-status-red/15 text-status-red ring-status-red/20',
  amber:   'bg-status-amber/15 text-status-amber ring-status-amber/20',
  blue:    'bg-status-blue/15 text-status-blue ring-status-blue/20',
  teal:    'bg-status-teal/15 text-status-teal ring-status-teal/20',
  purple:  'bg-status-purple/15 text-status-purple ring-status-purple/20',
  neutral: 'bg-surface-tertiary text-content-secondary ring-line/60',
};

function hashTone(s: string): PaletteKey {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

export default function Avatar({ name, src, alt, size = 'md', online, tone, className = '', children }: AvatarProps) {
  const s = sizing[size];
  const resolvedTone = tone ?? (name ? hashTone(name) : 'neutral');

  return (
    <span className={`relative inline-flex shrink-0 ${s.box} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt ?? name ?? 'avatar'}
          className="h-full w-full rounded-full object-cover ring-1 ring-line/60"
        />
      ) : (
        <span className={`h-full w-full rounded-full inline-flex items-center justify-center font-semibold ring-1 ${toneClasses[resolvedTone]}`}>
          {children ?? (name ? <span className={s.text}>{getInitials(name)}</span> : null)}
        </span>
      )}
      {online && (
        <span
          aria-label="Online"
          className={`absolute -bottom-0 -right-0 rounded-full bg-status-green ring-surface-primary ${s.dot}`}
        />
      )}
    </span>
  );
}
