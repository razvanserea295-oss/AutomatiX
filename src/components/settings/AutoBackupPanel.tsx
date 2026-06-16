









import { useCallback, useEffect, useState } from 'react';
import { Archive, Download, RotateCcw, Save, ShieldAlert, Cloud } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { getErrorMessage } from '@/utils/errors';
import { confirmDialog } from '@/components/ConfirmDialog';
import Button from '@/components/ui/Button';

interface AutoBackupConfig {
  enabled: boolean;
  hour: number;
  keepDaily: number;
  keepWeekly: number;
  keepMonthly: number;
  cloudEnabled: boolean;
  lastRunAt: number | null;
  directory: string;
}
interface AutoBackupItem { name: string; size: number; mtime: number; kind: 'auto' | 'pre-restore'; }

function formatBytes(n: number): string {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export default function AutoBackupPanel() {
  const [cfg, setCfg] = useState<AutoBackupConfig | null>(null);
  const [list, setList] = useState<AutoBackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([
        apiCommand<AutoBackupConfig>('auto_backup_config_get'),
        apiCommand<AutoBackupItem[]>('auto_backup_list'),
      ]);
      setCfg(c);
      setList(l || []);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Nu am putut încărca backup-ul automat'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const patch = (p: Partial<AutoBackupConfig>) => setCfg(c => (c ? { ...c, ...p } : c));

  const saveConfig = useCallback(async () => {
    if (!cfg) return;
    setSavingCfg(true);
    try {
      const saved = await apiCommand<AutoBackupConfig>('auto_backup_config_set', {
        enabled: cfg.enabled,
        hour: cfg.hour,
        keepDaily: cfg.keepDaily,
        keepWeekly: cfg.keepWeekly,
        keepMonthly: cfg.keepMonthly,
        cloudEnabled: cfg.cloudEnabled,
      });
      setCfg(c => (c ? { ...c, ...saved } : c));
      toast.success('Configurare backup salvată');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Salvare eșuată'));
    } finally {
      setSavingCfg(false);
    }
  }, [cfg]);

  const runNow = useCallback(async () => {
    setBusy(true);
    try {
      const r = await apiCommand<{ name: string; size: number }>('auto_backup_run_now');
      toast.success(`Arhivă creată: ${r.name} (${formatBytes(r.size)})`);
      await refresh();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Backup eșuat'));
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const download = useCallback(async (name: string) => {
    try {
      const r = await apiCommand<{ name: string; base64: string }>('auto_backup_download', { name });
      const bin = atob(r.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = r.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Descărcare eșuată'));
    }
  }, []);

  const restore = useCallback(async (name: string) => {
    
    const first = await confirmDialog({
      title: 'Restaurezi din această arhivă?',
      body: `Datele curente vor fi înlocuite cu „${name}". Se va crea automat o arhivă de siguranță înainte.`,
      confirmLabel: 'Continuă',
    });
    if (!first) return;
    const second = await confirmDialog({
      title: 'Confirmare finală',
      body: 'Această acțiune suprascrie baza de date și cheia de criptare pe disc. După restaurare TREBUIE să repornești serverul. Continui?',
      confirmLabel: 'Da, restaurează',
    });
    if (!second) return;

    setBusy(true);
    try {
      const r = await apiCommand<{ requiresRestart: boolean; safety: string }>('auto_backup_restore', { name });
      toast.success(`Restaurat. Arhivă de siguranță: ${r.safety}`);
      if (r.requiresRestart) {
        toast.warning('Repornește serverul ACUM pentru a aplica restaurarea.', 9000);
      }
      await refresh();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Restaurare eșuată'));
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  if (loading || !cfg) {
    return <div className="text-pm-sm text-content-muted">Se încarcă backup-ul automat…</div>;
  }

  const fieldCls = 'h-8 w-full rounded border border-line bg-surface-primary px-2 text-pm-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60';

  return (
    <div className="space-y-5 border-t border-line/60 pt-5">
      <div className="flex items-center gap-2">
        <Archive className="h-4 w-4 text-accent" />
        <h4 className="text-pm-sm font-semibold text-content-primary">Backup automat (arhivă completă)</h4>
      </div>
      <p className="text-pm-xs text-content-muted -mt-3">
        Arhivă ZIP zilnică cu baza de date criptată + cheia de criptare + folderele de fișiere.
        Spre deosebire de copia rapidă .db de mai sus, arhiva e suficientă pentru o restaurare completă.
      </p>

      {}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-pm-2xs uppercase tracking-wider text-content-muted">Activ</span>
          <select className={fieldCls} value={cfg.enabled ? '1' : '0'} onChange={e => patch({ enabled: e.target.value === '1' })}>
            <option value="1">Pornit</option>
            <option value="0">Oprit</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-pm-2xs uppercase tracking-wider text-content-muted">Ora rulării (0–23)</span>
          <input type="number" min={0} max={23} className={fieldCls} value={cfg.hour}
            onChange={e => patch({ hour: Math.min(Math.max(parseInt(e.target.value || '0', 10), 0), 23) })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-pm-2xs uppercase tracking-wider text-content-muted flex items-center gap-1"><Cloud className="h-3 w-3" /> Cloud</span>
          <select className={`${fieldCls} opacity-60`} value="0" disabled title="În curând">
            <option value="0">În curând</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-pm-2xs uppercase tracking-wider text-content-muted">Păstrează zilnice</span>
          <input type="number" min={0} className={fieldCls} value={cfg.keepDaily}
            onChange={e => patch({ keepDaily: Math.max(parseInt(e.target.value || '0', 10), 0) })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-pm-2xs uppercase tracking-wider text-content-muted">Păstrează săptămânale</span>
          <input type="number" min={0} className={fieldCls} value={cfg.keepWeekly}
            onChange={e => patch({ keepWeekly: Math.max(parseInt(e.target.value || '0', 10), 0) })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-pm-2xs uppercase tracking-wider text-content-muted">Păstrează lunare</span>
          <input type="number" min={0} className={fieldCls} value={cfg.keepMonthly}
            onChange={e => patch({ keepMonthly: Math.max(parseInt(e.target.value || '0', 10), 0) })} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={saveConfig} disabled={savingCfg}>
          <Save className="h-3.5 w-3.5" /> {savingCfg ? 'Se salvează…' : 'Salvează configurarea'}
        </Button>
        <Button size="sm" variant="outline" onClick={runNow} disabled={busy}>
          <Archive className="h-3.5 w-3.5" /> {busy ? 'Se procesează…' : 'Creează arhivă acum'}
        </Button>
        <span className="text-pm-2xs text-content-muted">
          {cfg.lastRunAt ? `Ultima arhivă: ${new Date(cfg.lastRunAt).toLocaleString('ro-RO')}` : 'Nicio arhivă încă'}
        </span>
      </div>

      {}
      <div className="flex items-start gap-2 rounded-md bg-status-amber/10 border border-status-amber/30 px-3 py-2 text-pm-xs text-status-amber">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Restaurarea in-place suprascrie baza de date pe disc și necesită <b>repornirea serverului</b>.
          Pentru recuperare în caz de dezastru, folosește <b>Descarcă</b> și păstrează arhiva în afara serverului.
        </span>
      </div>

      {}
      <div>
        <h5 className="text-pm-2xs uppercase tracking-wider text-content-muted mb-2">Arhive ({list.length})</h5>
        {list.length === 0 ? (
          <p className="text-pm-sm text-content-muted">Nu există încă nicio arhivă completă.</p>
        ) : (
          <div className="border border-line rounded-md overflow-hidden">
            <table className="w-full text-pm-sm">
              <thead className="bg-surface-tertiary/40 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
                <tr>
                  <th className="text-left px-3 py-2">Fișier</th>
                  <th className="text-left px-3 py-2">Tip</th>
                  <th className="text-left px-3 py-2">Mărime</th>
                  <th className="text-left px-3 py-2">Data</th>
                  <th className="text-right px-3 py-2">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.name} className="border-t border-line/60 hover:bg-surface-tertiary/30">
                    <td className="px-3 py-2 font-mono text-pm-xs text-content-secondary">{b.name}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-pm-2xs font-medium ${
                        b.kind === 'pre-restore' ? 'bg-status-amber/15 text-status-amber' : 'bg-accent/10 text-accent'}`}>
                        {b.kind === 'pre-restore' ? 'siguranță' : 'automat'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-content-muted tabular-nums">{formatBytes(b.size)}</td>
                    <td className="px-3 py-2 text-content-muted">{new Date(b.mtime).toLocaleString('ro-RO')}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => download(b.name)} title="Descarcă"
                          className="inline-flex items-center gap-1 h-7 px-2 rounded border border-line text-pm-2xs text-content-secondary hover:bg-surface-tertiary/60 hover:text-content-primary transition-colors">
                          <Download className="h-3 w-3" /> Descarcă
                        </button>
                        <button onClick={() => restore(b.name)} disabled={busy} title="Restaurează (necesită repornire)"
                          className="inline-flex items-center gap-1 h-7 px-2 rounded border border-status-red/40 text-pm-2xs text-status-red hover:bg-status-red/10 transition-colors disabled:opacity-50">
                          <RotateCcw className="h-3 w-3" /> Restaurează
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
