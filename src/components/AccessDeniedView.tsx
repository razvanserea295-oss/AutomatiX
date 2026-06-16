












import { ShieldOff, ArrowLeft } from 'lucide-react';

interface Props {
  
  pageId?: string;
  
  pageLabel?: string;
  
  roleLabel?: string;
  
  onGoHome: () => void;
}

export default function AccessDeniedView({ pageId, pageLabel, roleLabel, onGoHome }: Props) {
  const target = pageLabel || pageId || 'această pagină';
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-status-red/10 text-status-red mb-4">
          <ShieldOff className="h-8 w-8" />
        </div>
        <h1 className="text-pm-xl font-semibold text-content-primary mb-2">
          Nu ai acces la această pagină
        </h1>
        <p className="text-pm-sm text-content-muted mb-1">
          Pagina <span className="font-medium text-content-secondary">"{target}"</span> nu este disponibilă pentru rolul tău
          {roleLabel ? <> (<span className="font-medium">{roleLabel}</span>)</> : null}.
        </p>
        <p className="text-pm-xs text-content-muted mb-6">
          Dacă ai nevoie de acces, contactează administratorul.
        </p>
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-accent text-pm-sm font-semibold text-surface-primary hover:bg-accent/90 active:scale-[0.97] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi la Dashboard
        </button>
      </div>
    </div>
  );
}
