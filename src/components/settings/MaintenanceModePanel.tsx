







import { useEffect, useState } from 'react';
import { Wrench, Loader2, ShieldCheck } from '@/icons';
import { apiCommand } from '@/api/commands';
import { confirmDialog } from '@/components/ConfirmDialog';
import { toast } from '@/store/toastStore';
import { getErrorMessage } from '@/utils/errors';
import { useMaintenanceStore, type MaintenanceStatus } from '@/store/maintenanceStore';
import { formatDateTimeRo } from '@/lib/format';

export default function MaintenanceModePanel() {
  const setFromStatus = useMaintenanceStore(s => s.setFromStatus);
  const storeUpdatedAt = useMaintenanceStore(s => s.updatedAt);

  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('');
  const [eta, setEta] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiCommand<MaintenanceStatus>('get_maintenance_mode')
      .then(s => {
        if (cancelled) return;
        setActive(!!s.enabled);
        setMessage(s.message ?? '');
        setEta(s.eta ?? '');
        setFromStatus(s);
      })
      .catch(() => {  })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [setFromStatus]);

  const handleSave = async (nextActive: boolean) => {
    
    if (nextActive && !active) {
      const ok = await confirmDialog({
        title: 'Activezi modul mentenanță?',
        body: 'Toți utilizatorii non-admin vor vedea ecranul de mentenanță și nu vor putea folosi aplicația. Tu (admin) poți continua să lucrezi.',
        confirmLabel: 'Activează mentenanța',
        danger: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const res = await apiCommand<MaintenanceStatus>('set_maintenance_mode', {
        request: { enabled: nextActive, message: message.trim() || null, eta: eta.trim() || null },
      });
      setActive(!!res.enabled);
      setFromStatus(res);
      toast.success(nextActive ? 'Modul mentenanță a fost activat' : 'Modul mentenanță a fost dezactivat');
    } catch (err) {
      toast.error(err instanceof Error ? getErrorMessage(err) : 'Eroare la salvarea stării de mentenanță');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-content-muted text-pm-sm"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă...</div>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      {}
      <div className={`flex items-start gap-3 rounded-lg border p-4 ${
        active ? 'border-status-amber/40 bg-status-amber/8' : 'border-line bg-surface-tertiary/30'
      }`}>
        <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
          active ? 'bg-status-amber/15 text-status-amber' : 'bg-surface-tertiary text-content-muted'
        }`}>
          {active ? <Wrench className="h-4.5 w-4.5" /> : <ShieldCheck className="h-4.5 w-4.5" />}
        </span>
        <div className="min-w-0">
          <p className="text-pm-sm font-semibold text-content-primary">
            {active ? 'Mentenanță ACTIVĂ' : 'Aplicația funcționează normal'}
          </p>
          <p className="text-pm-xs text-content-muted mt-0.5">
            {active
              ? 'Utilizatorii non-admin văd ecranul de mentenanță. Tu poți lucra în continuare.'
              : 'Toți utilizatorii au acces complet.'}
            {storeUpdatedAt && <> · ultima schimbare {formatDateTimeRo(storeUpdatedAt)}</>}
          </p>
        </div>
        {}
        <button
          type="button"
          role="switch"
          aria-checked={active}
          disabled={saving}
          onClick={() => handleSave(!active)}
          className={`ml-auto shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            active ? 'bg-status-amber' : 'bg-surface-tertiary'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {}
      <div className="space-y-3">
        <label className="block">
          <span className="text-pm-xs font-medium text-content-secondary">Mesaj afișat utilizatorilor</span>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            placeholder="Aplicația este momentan în mentenanță. Revenim cât mai curând — mulțumim pentru răbdare."
            className="mt-1 w-full rounded-md border border-line bg-surface-primary px-3 py-2 text-pm-sm text-content-primary focus:outline-none focus:border-accent resize-y"
          />
        </label>
        <label className="block">
          <span className="text-pm-xs font-medium text-content-secondary">Timp estimat (opțional)</span>
          <input
            type="text"
            value={eta}
            onChange={e => setEta(e.target.value)}
            placeholder="ex: revenim în ~30 min · azi la ora 18:00"
            className="mt-1 w-full rounded-md border border-line bg-surface-primary px-3 py-2 text-pm-sm text-content-primary focus:outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSave(active)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface-tertiary/40 px-4 text-pm-sm font-medium text-content-secondary hover:bg-surface-tertiary active:scale-[0.97] transition-all disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Salvează mesajul
        </button>
        <p className="text-pm-2xs text-content-muted">Mesajul/ETA se salvează și la comutarea switch-ului.</p>
      </div>
    </div>
  );
}
