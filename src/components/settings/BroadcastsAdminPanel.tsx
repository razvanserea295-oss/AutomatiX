


















import { useEffect, useState, useCallback } from 'react';
import {
  Megaphone, AlertTriangle, AlertOctagon, Trash2, Send, Loader2, Plus, X, RefreshCw,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import StatusBadge from '@/components/ui/StatusBadge';

interface AdminBroadcast {
  id: number;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'important';
  created_by_user_id: number;
  created_by_name: string | null;
  created_at: string;
  expires_at: string | null;
  dismissed_count?: number;
}

const SEVERITY_OPTIONS: Array<{ value: AdminBroadcast['severity']; label: string; icon: typeof Megaphone; color: string }> = [
  { value: 'info',      label: 'Informare',  icon: Megaphone,    color: 'text-accent' },
  { value: 'warning',   label: 'Atenție',    icon: AlertTriangle, color: 'text-status-amber' },
  { value: 'important', label: 'Important',  icon: AlertOctagon,  color: 'text-status-red' },
];

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ro-RO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export default function BroadcastsAdminPanel(): JSX.Element {
  const [items, setItems] = useState<AdminBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<AdminBroadcast['severity']>('info');
  const [expiresAt, setExpiresAt] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiCommand<AdminBroadcast[]>('admin_list_broadcasts');
      setItems(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la încărcare anunțuri');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setSeverity('info');
    setExpiresAt('');
  };

  const send = async () => {
    if (!title.trim()) { toast.error('Titlul este obligatoriu'); return; }
    if (!body.trim()) { toast.error('Conținutul este obligatoriu'); return; }
    setSending(true);
    try {
      await apiCommand('admin_create_broadcast', {
        request: {
          title: title.trim(),
          body: body.trim(),
          severity,
          expires_at: expiresAt || null,
        },
      });
      toast.success('Anunț trimis. Va apărea la fiecare user la următoarea deschidere.');
      resetForm();
      setComposing(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la trimitere');
    } finally {
      setSending(false);
    }
  };

  const remove = async (b: AdminBroadcast) => {
    const ok = await confirmDialog({
      title: 'Șterge anunțul?',
      body: `"${b.title}" — va dispărea și pentru userii care nu l-au văzut încă.`,
      danger: true,
    });
    if (!ok) return;
    try {
      await apiCommand('admin_delete_broadcast', { id: b.id });
      toast.success('Anunț șters');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
  };

  return (
    <div className="space-y-4">
      {}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-pm-md font-semibold text-content-primary flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-accent" /> Anunțuri pentru utilizatori
          </h2>
          <p className="text-pm-xs text-content-muted mt-0.5">
            Popup-uri care apar o singură dată la fiecare user, la prima deschidere a aplicației după trimitere.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
            title="Reîncarcă lista"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {!composing && (
            <button
              onClick={() => setComposing(true)}
              className="h-8 px-3 bg-accent text-pm-xs font-semibold text-surface-primary hover:opacity-90 inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Anunț nou
            </button>
          )}
        </div>
      </div>

      {}
      {composing && (
        <div className="border border-line bg-surface-primary p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-pm-sm font-semibold text-content-primary">Anunț nou</h3>
            <button
              onClick={() => { setComposing(false); resetForm(); }}
              className="p-1 text-content-muted hover:bg-surface-tertiary hover:text-accent"
              aria-label="Închide"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Titlu *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex: Update v1.3 — Rol Manager adăugat"
              maxLength={120}
              className="w-full h-9 border border-line bg-surface-primary px-3 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Severitate</label>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = severity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={`flex-1 h-9 border text-pm-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                      active
                        ? 'border-accent bg-accent/10 text-content-primary'
                        : 'border-line text-content-muted hover:bg-surface-tertiary hover:text-content-primary'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? opt.color : ''}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Mesaj *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="Detalii despre update, mentenanță programată, etc. Multi-line OK."
              className="w-full bg-surface-primary border border-line text-sm text-content-primary placeholder:text-content-muted resize-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Expiră la (opțional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full h-9 border border-line bg-surface-primary px-3 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
            <p className="text-pm-2xs text-content-muted mt-1">
              Dacă completezi, popup-ul nu mai apare la useri după acest moment (utile pentru mentenanțe programate). Lasă gol pentru un anunț fără expirare.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setComposing(false); resetForm(); }}
              className="px-3 py-1.5 text-pm-xs border border-line text-content-secondary hover:bg-surface-tertiary"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={send}
              disabled={sending || !title.trim() || !body.trim()}
              className="h-8 px-4 bg-accent text-pm-xs font-semibold text-surface-primary hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {sending ? 'Se trimite...' : 'Trimite la toți userii'}
            </button>
          </div>
        </div>
      )}

      {}
      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-line/80 bg-surface-primary/40 py-10 flex flex-col items-center justify-center text-content-muted">
          <Megaphone className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-pm-sm">Niciun anunț încă</p>
          <p className="text-pm-2xs mt-1">Apasă "Anunț nou" pentru a trimite primul popup.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line/60 border border-line bg-surface-primary">
          {items.map(b => {
            const sev = SEVERITY_OPTIONS.find(o => o.value === b.severity) ?? SEVERITY_OPTIONS[0];
            const Icon = sev.icon;
            const expired = b.expires_at && new Date(b.expires_at) < new Date();
            return (
              <li key={b.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${sev.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-pm-sm font-semibold text-content-primary">{b.title}</h3>
                      <StatusBadge
                        tone={b.severity === 'important' ? 'danger' : b.severity === 'warning' ? 'warning' : 'info'}
                        label={sev.label}
                        size="xs"
                      />
                      {expired && (
                        <StatusBadge tone="neutral" label="Expirat" size="xs" />
                      )}
                    </div>
                    <p className="text-pm-xs text-content-secondary mt-1 whitespace-pre-wrap leading-relaxed">{b.body}</p>
                    <p className="text-pm-2xs text-content-muted mt-2">
                      Trimis de {b.created_by_name || '—'} · {fmt(b.created_at)}
                      {b.expires_at && <> · Expiră {fmt(b.expires_at)}</>}
                      {typeof b.dismissed_count === 'number' && <> · {b.dismissed_count} useri l-au văzut</>}
                    </p>
                  </div>
                  <button
                    onClick={() => void remove(b)}
                    title="Șterge anunțul"
                    className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-status-red shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
