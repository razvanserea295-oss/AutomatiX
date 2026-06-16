












import { useState, useCallback, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';

export interface SupplierCode {
  id: number;
  code: string;
  label: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  
  isAdmin: boolean;
  
  onChanged?: () => void;
}

interface CodeDraft {
  id?: number;
  code: string;
  label: string;
  description: string;
  color: string;
}

const EMPTY_DRAFT: CodeDraft = { code: '', label: '', description: '', color: '#f97316' };

export default function SupplierCodesModal({ open, onClose, isAdmin, onChanged }: Props) {
  const [codes, setCodes] = useState<SupplierCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<CodeDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiCommand<SupplierCode[]>('get_supplier_codes', { include_inactive: isAdmin });
      setCodes(list);
    } catch (e: any) {
      toast.error(e?.message || 'Nu am putut încărca codurile');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (open) { refresh(); setDraft(null); }
  }, [open, refresh]);

  const startCreate = () => setDraft({ ...EMPTY_DRAFT });
  const startEdit = (c: SupplierCode) => setDraft({
    id: c.id,
    code: c.code,
    label: c.label,
    description: c.description || '',
    color: c.color || '#f97316',
  });

  const save = async () => {
    if (!draft) return;
    if (!/^[A-Za-z]{2,10}$/.test(draft.code.trim())) {
      toast.error('Codul trebuie 2-10 litere'); return;
    }
    if (!draft.label.trim()) { toast.error('Eticheta e obligatorie'); return; }
    setSaving(true);
    try {
      const payload = {
        code: draft.code.trim().toUpperCase(),
        label: draft.label.trim(),
        description: draft.description.trim() || null,
        color: draft.color || null,
      };
      if (draft.id) {
        await apiCommand('update_supplier_code', { id: draft.id, ...payload });
        toast.success('Cod actualizat');
      } else {
        await apiCommand('create_supplier_code', payload);
        toast.success('Cod adăugat');
      }
      setDraft(null);
      await refresh();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || 'Eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Sigur dezactivezi acest cod? Piesele etichetate cu el își păstrează tag-ul, doar nu mai apare în picker.')) return;
    try {
      await apiCommand('delete_supplier_code', { id });
      toast.success('Cod dezactivat');
      await refresh();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || 'Eroare la dezactivare');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-surface-primary border border-line rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <h2 className="text-pm-lg font-semibold text-content-primary">Coduri furnizor</h2>
            <p className="text-pm-xs text-content-muted mt-0.5">
              Prefix la numele fișierului → piesa apare la "De comandat". Ex: <code className="font-mono bg-surface-tertiary px-1 rounded">CMO_pompa.SLDPRT</code>
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-tertiary text-content-muted">
            <X className="h-4 w-4 m-auto" />
          </button>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <p className="text-pm-sm text-content-muted">Se încarcă...</p>
          ) : codes.length === 0 ? (
            <p className="text-pm-sm text-content-muted">Niciun cod configurat. {isAdmin && 'Apasă "Adaugă cod" mai jos.'}</p>
          ) : (
            codes.map(c => (
              <div key={c.id}
                className={`border rounded-md p-3 flex items-start gap-3 ${
                  c.active ? 'border-line bg-surface-primary' : 'border-line/40 bg-surface-tertiary/40 opacity-60'
                }`}>
                <div
                  className="h-9 w-9 rounded shrink-0 flex items-center justify-center text-white font-bold text-pm-xs"
                  style={{ background: c.color || '#6b7280' }}
                >
                  {c.code}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-pm-sm font-semibold text-content-primary">{c.label}</p>
                  {c.description && <p className="text-pm-xs text-content-muted mt-0.5">{c.description}</p>}
                  {!c.active && <span className="text-pm-2xs text-status-red font-medium uppercase">Dezactivat</span>}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(c)} title="Editează"
                      className="h-7 w-7 rounded hover:bg-surface-tertiary text-content-muted hover:text-content-primary flex items-center justify-center">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {c.active && (
                      <button onClick={() => remove(c.id)} title="Dezactivează"
                        className="h-7 w-7 rounded hover:bg-status-red/10 text-content-muted hover:text-status-red flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {}
          {isAdmin && draft && (
            <div className="border-2 border-accent rounded-md p-4 bg-accent/5 space-y-3 mt-4">
              <p className="text-pm-xs font-semibold uppercase tracking-wider text-accent">
                {draft.id ? 'Editare cod' : 'Cod nou'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Cod (prefix)</label>
                  <input
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().slice(0, 10) })}
                    placeholder="ex: CMO, EL, HID"
                    className="w-full h-9 px-3 border border-line bg-surface-primary rounded text-pm-sm font-mono font-bold uppercase focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Culoare badge</label>
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                    className="w-full h-9 border border-line bg-surface-primary rounded cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Etichetă</label>
                <input
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder="ex: Componentă Mecanică Outsourced"
                  className="w-full h-9 px-3 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Descriere (opțional)</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={2}
                  placeholder="Ce înseamnă acest cod? Exemple de piese?"
                  className="w-full px-3 py-2 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent resize-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-line">
                <button onClick={() => setDraft(null)} disabled={saving}
                  className="h-8 px-3 rounded border border-line text-pm-xs text-content-secondary hover:bg-surface-tertiary">
                  Anulează
                </button>
                <button onClick={save} disabled={saving}
                  className="h-8 px-4 rounded bg-accent text-pm-xs font-semibold text-surface-primary hover:bg-accent/90 flex items-center gap-1.5 disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Se salvează...' : draft.id ? 'Salvează' : 'Adaugă'}
                </button>
              </div>
            </div>
          )}
        </div>

        {}
        {isAdmin && !draft && (
          <div className="px-5 py-3 border-t border-line bg-surface-tertiary/30">
            <button onClick={startCreate}
              className="h-8 px-4 rounded bg-accent text-pm-xs font-semibold text-surface-primary hover:bg-accent/90 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Adaugă cod
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
