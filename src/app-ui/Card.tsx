import { AlertTriangle, Inbox, Loader2 } from '@/icons';
import type { HTMLAttributes, ReactNode } from 'react';

type Pad = 'none' | 'sm' | 'md' | 'lg';
type CardTone = 'default' | 'subtle' | 'elevated' | 'flat';
type CardStateKind = 'empty' | 'loading' | 'error';

const pad: Record<Pad, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-4 sm:p-5 lg:p-6',
  lg: 'p-5 sm:p-6 lg:p-7',
};
const toneClass: Record<CardTone, string> = {
  default: 'bg-surface-primary',
  subtle: 'bg-surface-secondary/45',
  elevated: 'bg-surface-primary surface-card-elevated',
  flat: 'bg-surface-primary border-line/40 shadow-none',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Pad;
  /** Legacy props — accepted, styling unified */
  tone?: string;
  density?: string;
  interactive?: boolean;
  vtName?: string;
}

export function Card({
  padding = 'none',
  tone = 'default',
  interactive = false,
  density: _density,
  className = '',
  children,
  vtName,
  style,
  ...rest
}: CardProps) {
  const normalizedTone = tone in toneClass ? (tone as CardTone) : 'default';
  const padClass = padding === 'none' ? '' : `pm-card-pad ${pad[padding]}`;

  return (
    <div
      className={`ds-card pm-card surface-card ixn-border-hover flex min-h-0 w-full flex-col justify-start overflow-hidden rounded-xl border border-line/60 ${toneClass[normalizedTone]} ${interactive ? 'ds-card--interactive card-interactive ixn-focus' : ''} ${padClass} ${className}`}
      style={vtName ? { viewTransitionName: vtName, ...style } : style}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CardHeadProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHead({ title, subtitle, actions, className = '' }: CardHeadProps) {
  return (
    <div className={`shrink-0 border-b border-line/60 bg-surface-secondary/35 px-4 py-3 sm:px-6 sm:py-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <div className="truncate text-pm-md font-semibold leading-tight text-content-primary">{title}</div>
          {subtitle && <p className="mt-1 text-pm-sm leading-relaxed text-content-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex max-w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end sm:pl-2">{actions}</div>}
      </div>
    </div>
  );
}

export const CardHeader = CardHead;

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Pad;
  /**
   * When true, the body grows (`flex-1 min-h-0`) inside a flex-column card.
   * Pair with `overflow-auto` on the body or a nested child for scroll regions.
   */
  fill?: boolean;
}

export function CardBody({ padding = 'md', fill = false, className = '', ...rest }: CardBodyProps) {
  const padClass = padding === 'none' ? '' : `pm-card-pad ${pad[padding]}`;
  const growCls = fill ? 'flex min-h-0 flex-1 flex-col justify-start' : '';
  return <div className={`pm-card-body w-full ${growCls} ${padClass} ${className}`} {...rest} />;
}

interface CardActionsProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end' | 'between';
}

const actionsAlign: Record<NonNullable<CardActionsProps['align']>, string> = {
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
};

export function CardActions({ align = 'end', className = '', ...rest }: CardActionsProps) {
  return (
    <div
      className={`flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-t border-line/60 bg-surface-secondary/25 px-4 py-3 sm:px-6 ${actionsAlign[align]} ${className}`}
      {...rest}
    />
  );
}

interface CardStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  kind?: CardStateKind;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  /** Vertically center inside a tall card — default is top-aligned */
  centered?: boolean;
}

const stateTitle: Record<CardStateKind, string> = {
  empty: 'Niciun rezultat',
  loading: 'Se încarcă',
  error: 'Ceva nu a mers',
};

const stateTone: Record<CardStateKind, string> = {
  empty: 'bg-accent-muted text-accent',
  loading: 'bg-surface-tertiary text-content-muted',
  error: 'bg-status-red/10 text-status-red',
};

export function CardState({
  kind = 'empty',
  title,
  description,
  action,
  icon,
  centered = false,
  className = '',
  ...rest
}: CardStateProps) {
  const glyph = icon ?? (kind === 'error' ? <AlertTriangle className="h-5 w-5" /> : kind === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Inbox className="h-5 w-5" />);
  const alignCls = centered ? 'justify-center' : 'justify-start';

  return (
    <div
      className={`anim-scale-in flex min-h-[168px] w-full flex-col items-center ${alignCls} px-6 py-10 text-center ${className}`}
      role={kind === 'loading' ? 'status' : undefined}
      aria-busy={kind === 'loading' ? true : undefined}
      {...rest}
    >
      <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${stateTone[kind]}`}>
        {glyph}
      </span>
      <p className="mt-4 text-pm-md font-semibold text-content-primary">{title ?? stateTitle[kind]}</p>
      {description && <p className="mt-1 max-w-sm text-pm-sm text-content-muted break-words">{description}</p>}
      {kind === 'loading' && (
        <div className="mt-4 w-full max-w-xs space-y-2" aria-hidden>
          <div className="ds-skeleton h-2 w-full rounded-full" />
          <div className="ds-skeleton h-2 w-2/3 rounded-full" />
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default Card;
