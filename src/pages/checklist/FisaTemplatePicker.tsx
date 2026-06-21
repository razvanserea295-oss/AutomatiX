








import { useState, useEffect } from 'react';
import { ClipboardCheck, X, Loader2, FileText, Star } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';

export interface FisaTemplate {
  id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by_name: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (templateId: number) => void;
  
  title?: string;
}

export default function FisaTemplatePicker({ open, onClose, onPick, title }: Props) {
  const [templates, setTemplates] = useState<FisaTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiCommand<FisaTemplate[]>('get_fisa_templates')
      .then(list => {
        setTemplates(list);
        
        
        
        const def = list.find(t => t.is_default);
        setSelectedId(def?.id ?? list[0]?.id ?? null);
      })
      .catch((e) => toast.error(e?.message || 'Nu pot încărca template-urile'))
      .finally(() => setLoading(false));
  }, [open]);

  const confirm = () => {
    if (!selectedId) {
      toast.error('Selectează un template');
      return;
    }
    onPick(selectedId);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-surface-primary border border-line rounded-lg shadow-xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-pm-lg font-semibold text-content-primary flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            {title || 'Alege template pentru fișa nouă'}
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-tertiary text-content-muted">
            <X className="h-4 w-4 m-auto" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
          ) : templates.length === 0 ? (
            <p className="text-pm-sm text-content-muted text-center py-6">Niciun template disponibil.</p>
          ) : templates.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left border rounded p-3 transition-colors ${
                selectedId === t.id
                  ? 'border-accent bg-accent/8'
                  : 'border-line bg-surface-primary hover:bg-surface-tertiary/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-3.5 w-3.5 text-content-muted shrink-0" />
                <p className="flex-1 text-pm-sm font-semibold text-content-primary">{t.name}</p>
                {t.is_default && (
                  <span className="inline-flex items-center gap-1 text-pm-2xs bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                    <Star className="h-2.5 w-2.5" /> Implicit
                  </span>
                )}
              </div>
              {t.description && (
                <p className="text-pm-xs text-content-muted line-clamp-2">{t.description}</p>
              )}
              {t.created_by_name && !t.is_default && (
                <p className="text-pm-2xs text-content-muted/70 mt-1">creat de {t.created_by_name}</p>
              )}
            </button>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-line bg-surface-secondary flex items-center gap-2">
          <button onClick={onClose}
            className="h-9 px-4 rounded border border-line text-pm-sm text-content-secondary hover:bg-surface-tertiary">
            Anulează
          </button>
          <button onClick={confirm} disabled={!selectedId || loading}
            className="ml-auto h-9 px-5 rounded bg-accent text-pm-sm font-semibold text-[var(--color-on-accent)] hover:bg-accent/90 disabled:opacity-50">
            Creează fișa
          </button>
        </div>
      </div>
    </div>
  );
}
