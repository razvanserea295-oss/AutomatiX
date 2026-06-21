





import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

type Padding = 'none' | 'sm' | 'md' | 'lg';
type Tone = 'default' | 'subtle' | 'elevated' | 'flat';
type Density = 'compact' | 'comfortable';

const padding: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};


const densityScale: Record<Density, Record<Padding, string>> = {
  comfortable: padding,
  compact: { none: '', sm: 'p-2', md: 'p-3', lg: 'p-5' },
};

const tone: Record<Tone, string> = {
  
  default:  'surface-card',
  subtle:   'bg-surface-secondary border border-line/70',
  elevated: 'surface-card surface-card-elevated',
  flat:     'bg-surface-primary border border-line',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  tone?: Tone;
  
  interactive?: boolean;
  
  density?: Density;
  

  vtName?: string;
}

export function Card({
  padding: p = 'none',
  tone: t = 'default',
  density: d = 'comfortable',
  interactive = false,
  className = '',
  vtName,
  style,
  ...rest
}: CardProps) {
  const padCls = densityScale[d][p];
  return (
    <div
      className={`pm-card ${p !== 'none' ? 'pm-card-pad' : ''} rounded-2xl transition-smooth ${tone[t]} ${padCls} ${interactive ? 'card-interactive active:scale-[0.99]' : ''} ${vtName ? 'vt-morph' : ''} ${className}`}
      style={vtName ? ({ viewTransitionName: vtName, ...style } as CSSProperties) : style}
      {...rest}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, actions, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 px-5 py-4 border-b border-line/70 ${className}`}>
      <div className="min-w-0">
        <div className="text-pm-md font-semibold text-content-primary leading-tight">{title}</div>
        {subtitle && <p className="mt-1 text-pm-sm text-content-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
}

export function CardBody({ padding: p = 'md', className = '', ...rest }: CardBodyProps) {
  return <div className={`${padding[p]} ${className}`} {...rest} />;
}

export default Card;
