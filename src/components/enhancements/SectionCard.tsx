import type { ComponentType, ReactNode } from 'react';

interface Props {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: boolean;
}








export default function SectionCard({ title, icon: Icon, description, actions, children, className = '', accent }: Props) {
  return (
    <section className={`glass-surface rounded-xl overflow-hidden enter-up ${className}`}>
      <header className="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-line/40">
        {Icon && (
          <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            accent ? 'bg-accent/16 text-accent' : 'bg-accent/10 text-accent/80'
          }`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-secondary truncate">{title}</h3>
          {description && <p className="text-pm-2xs text-content-muted mt-0.5 truncate">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
