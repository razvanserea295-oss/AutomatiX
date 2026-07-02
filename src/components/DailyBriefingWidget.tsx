











import { useEffect, useState } from 'react';
import {
  Sun, RefreshCw, Loader2, Flame, Clock, Calendar, AlertTriangle, Bell,
  Phone, Clipboard, Package, Box, Banknote, Activity, Target, Factory,
  Flag, ArrowRight, PenTool, ChevronRight,
} from '@/icons';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import StatusBadge from '@/components/ui/StatusBadge';
import type { StatusTone } from '@/lib/statusTokens';

interface SectionItem {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'red' | 'amber' | 'blue' | 'green' | 'gray';
}
interface Section {
  title: string;
  icon: string;
  items: SectionItem[];
}
interface Highlight {
  icon: string;
  tone: 'red' | 'amber' | 'blue' | 'green' | 'gray';
  text: string;
  count?: number;
}
interface Details {
  generated_at: string;
  period?: { year: number; month: number; label: string };
  user: { id: number; username: string; role: string; full_name: string };
  highlights: Highlight[];
  sections: Section[];
}
interface Briefing {
  summary_text: string;
  action_count: number;
  briefing_date: string;
  created_at: string;
  details_json: string | null;
}

const ICON_MAP: Record<string, typeof Sun> = {
  flame: Flame, clock: Clock, calendar: Calendar, alert: AlertTriangle, bell: Bell,
  phone: Phone, clipboard: Clipboard, package: Package, box: Box, banknote: Banknote,
  pulse: Activity, target: Target, factory: Factory, flag: Flag, 'arrow-right': ArrowRight,
  'pen-tool': PenTool,
};

const TONE_TEXT: Record<string, string> = {
  red:    'text-status-red',
  amber:  'text-status-amber',
  blue:   'text-status-blue',
  green:  'text-status-green',
  gray:   'text-content-muted',
};

const HIGHLIGHT_TONE: Record<string, StatusTone> = {
  red:    'danger',
  amber:  'warning',
  blue:   'info',
  green:  'success',
  gray:   'neutral',
};





function routeForText(text: string): string | null {
  const t = text.toLowerCase();
  if (/anomalie|anomalii/.test(t)) return 'manager-control';
  if (/aler[tţ]/.test(t))           return 'alerts';
  if (/predare|predări|handoff/.test(t)) return 'dashboard'; 
  if (/lead|negociere|vânzare|oferta|client/.test(t)) return 'sales-hub';
  if (/proiect|deadline|termen|întârziat/.test(t)) return 'projects';
  if (/material|stoc/.test(t))       return 'materials';
  if (/factur[aă]|venit|cost|profit|finan/.test(t)) return 'finance';
  if (/produc[tţ]ie|hala|sta[tţ]ie/.test(t)) return 'production';
  return null;
}

export default function DailyBriefingWidget({ onNavigate }: { onNavigate?: (page: string) => void } = {}) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    
    
    
    
    if (!silent) setLoading(true);
    try {
      const b = await apiCommand<Briefing>('get_my_briefing');
      setBriefing(b);
    } catch (err) {
      console.error('[DailyBriefing] load failed:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const b = await apiCommand<Briefing>('refresh_my_briefing');
      setBriefing(b);
      toast.success('Briefing actualizat');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la actualizare');
    } finally {
      setRefreshing(false);
    }
  };

  
   
   
   
   
   
   
  useEffect(() => {
    void load();
    const isHidden = () => typeof document !== 'undefined' && document.hidden;
    const handle = setInterval(() => {
      if (isHidden()) return;
      void load({ silent: true });
    }, 15000);
    const onVisible = () => { if (!isHidden()) void load({ silent: true }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(handle);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const details: Details | null = (() => {
    if (!briefing?.details_json) return null;
    try { return JSON.parse(briefing.details_json) as Details; } catch { return null; }
  })();

  return (
    <div className="bg-surface-secondary border-b border-line overflow-hidden">
      {}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line/50">
        <Sun className="h-5 w-5 text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-pm-2xs font-semibold uppercase tracking-wide text-accent">Briefing lunar</span>
            {briefing && briefing.action_count > 0 && (
              <span className="inline-flex items-center px-1.5 py-0 rounded bg-accent/20 text-accent text-pm-2xs font-bold">
                {briefing.action_count} {briefing.action_count === 1 ? 'acțiune' : 'acțiuni'}
              </span>
            )}
            {(details?.period?.label || briefing?.briefing_date) && (
              <span className="text-pm-2xs text-content-muted">
                · {details?.period?.label
                    ?? new Date(briefing!.briefing_date).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
          <p className="text-sm text-content-primary mt-0.5 leading-snug">
            {loading ? 'Se generează briefing-ul...' : briefing?.summary_text ?? 'Nu am putut genera briefing-ul.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 rounded px-2 py-1 text-pm-2xs text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
          title={expanded ? 'Restrânge detaliile' : 'Extinde detaliile'}
        >
          {expanded ? 'Mai puțin' : 'Mai multe'}
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          title="Reîmprospătează briefing"
          className="shrink-0 rounded p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      {}
      {expanded && details && details.highlights.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-line/50 bg-surface-primary/30">
          {details.highlights.map((h, i) => {
            const Icon = ICON_MAP[h.icon] ?? AlertTriangle;
            const target = onNavigate ? routeForText(h.text) : null;
            const tone = HIGHLIGHT_TONE[h.tone] ?? 'neutral';
            const chip = <StatusBadge tone={tone} size="xs" label={h.text} />;
            if (target && onNavigate) {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onNavigate(target)}
                  title={`Deschide ${target}`}
                  className="inline-flex items-center gap-1 hover:brightness-110 active:scale-[0.97] transition-all cursor-pointer"
                >
                  <Icon className="h-3 w-3 text-content-muted shrink-0" />
                  {chip}
                  <ChevronRight className="h-3 w-3 text-content-muted opacity-70" />
                </button>
              );
            }
            return (
              <span key={i} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3 text-content-muted shrink-0" />
                {chip}
              </span>
            );
          })}
        </div>
      )}

      {}
      {expanded && details && details.sections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {details.sections.map((s, idx) => {
            const Icon = ICON_MAP[s.icon] ?? Activity;
            return (
              <div key={idx} className="bg-surface-primary/40 border border-line/50 p-3">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-line/30">
                  <Icon className="h-3.5 w-3.5 text-accent" />
                  <span className="text-pm-2xs font-semibold uppercase tracking-wide text-content-secondary">{s.title}</span>
                </div>
                {


}
                <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  {s.items.map((it, i) => {
                    const numericValue = typeof it.value === 'number' ? it.value
                      : Number(String(it.value).replace(/[^\d.-]/g, '')) || 0;
                    const target = onNavigate && numericValue > 0
                      ? routeForText(`${it.label} ${it.sub ?? ''} ${s.title}`)
                      : null;
                    const inner = (
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-pm-2xs uppercase tracking-wide text-content-muted line-clamp-2 leading-snug" title={it.label}>{it.label}</span>
                        <span className={`text-pm-md tabular-nums font-semibold leading-tight ${TONE_TEXT[it.tone ?? 'gray']}`}>
                          {it.value}
                        </span>
                        {it.sub && <span className="text-pm-2xs text-content-muted truncate" title={it.sub}>{it.sub}</span>}
                      </div>
                    );
                    if (target && onNavigate) {
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => onNavigate(target)}
                            className="w-full text-left hover:bg-surface-tertiary/40 -mx-1.5 px-1.5 py-1 transition-colors cursor-pointer"
                            title={`Deschide ${target}`}
                          >
                            {inner}
                          </button>
                        </li>
                      );
                    }
                    return <li key={i}>{inner}</li>;
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
