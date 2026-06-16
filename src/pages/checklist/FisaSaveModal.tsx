

















import { useState, useEffect } from 'react';
import { Save, X, FolderOpen, FileText, FilePlus2, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export type SaveDest = 'project' | 'template' | 'new';
export interface SaveChoice {
  dest: SaveDest;
  
  name?: string;
  description?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (choice: SaveChoice) => void | Promise<void>;
  saving: boolean;
  
  dirty: boolean;
  
  hasTemplate: boolean;
  
  templateName: string | null;
}

interface OptionMeta {
  dest: SaveDest;
  icon: typeof Save;
  title: string;
  desc: string;
}

export default function FisaSaveModal({ open, onClose, onConfirm, saving, dirty, hasTemplate, templateName }: Props) {
  const [dest, setDest] = useState<SaveDest>('project');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  
  
  
  useEffect(() => {
    if (!open) return;
    setDest(dirty ? 'project' : 'new');
    setName('');
    setDescription('');
  }, [open, dirty]);

  if (!open) return null;

  const options: OptionMeta[] = [
    {
      dest: 'project',
      icon: FolderOpen,
      title: 'Salvează pe fișa proiectului',
      desc: 'Modificările afectează doar fișa acestui proiect. Nu propagă spre alte proiecte sau spre șablon.',
    },
    {
      dest: 'template',
      icon: FileText,
      title: 'Salvează în șablonul curent (suprascrie)',
      desc: hasTemplate
        ? `Structura curentă înlocuiește șablonul „${templateName || 'sursă'}". Fișele viitoare create din el vor prelua noua structură.`
        : 'Fișa nu are un șablon sursă — indisponibil.',
    },
    {
      dest: 'new',
      icon: FilePlus2,
      title: 'Salvează ca șablon nou',
      desc: 'Creează un șablon nou cu structura curentă. Originalul rămâne neschimbat. Autor = tu, dată = acum.',
    },
  ];

  const isOptionDisabled = (o: OptionMeta) =>
    (o.dest === 'project' && !dirty) || (o.dest === 'template' && !hasTemplate);

  const confirmDisabled =
    saving ||
    (dest === 'project' && !dirty) ||
    (dest === 'template' && !hasTemplate) ||
    (dest === 'new' && !name.trim());

  const confirmLabel =
    dest === 'project' ? 'Salvează pe fișă' : dest === 'template' ? 'Salvează în șablon' : 'Creează șablon';

  const handleConfirm = () => {
    if (confirmDisabled) return;
    if (dest === 'new') {
      void onConfirm({ dest, name: name.trim(), description: description.trim() || undefined });
    } else {
      void onConfirm({ dest });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-surface-primary border border-line rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-pm-lg font-semibold text-content-primary flex items-center gap-2">
            <Save className="h-4 w-4" />
            Unde salvezi fișa?
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-tertiary text-content-muted">
            <X className="h-4 w-4 m-auto" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {options.map((o) => {
            const disabled = isOptionDisabled(o);
            const selected = dest === o.dest;
            const Icon = o.icon;
            return (
              <button
                key={o.dest}
                type="button"
                disabled={disabled}
                onClick={() => setDest(o.dest)}
                className={`w-full text-left border rounded p-3 transition-colors flex gap-3 ${
                  disabled
                    ? 'border-line bg-surface-secondary/40 opacity-50 cursor-not-allowed'
                    : selected
                      ? 'border-accent bg-accent/8'
                      : 'border-line bg-surface-primary hover:bg-surface-tertiary/40'
                }`}
              >
                <span className="mt-0.5">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      selected && !disabled ? 'border-accent' : 'border-content-muted'
                    }`}
                  >
                    {selected && !disabled && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="h-3.5 w-3.5 text-content-muted shrink-0" />
                    <span className="text-pm-sm font-semibold text-content-primary">{o.title}</span>
                  </span>
                  <span className="block text-pm-xs text-content-muted">{o.desc}</span>
                </span>
              </button>
            );
          })}

          {}
          {dest === 'new' && (
            <div className="border border-line rounded p-3 space-y-3 bg-surface-secondary/40">
              <div>
                <label className="block text-pm-xs text-content-muted mb-1">
                  Nume șablon <span className="text-status-red">*</span>
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex. Stație betoane M80"
                  className="w-full h-9 border border-line bg-surface-primary px-2.5 text-pm-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60"
                />
              </div>
              <div>
                <label className="block text-pm-xs text-content-muted mb-1">Descriere (opțional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Scurtă descriere a șablonului…"
                  className="w-full border border-line bg-surface-primary px-2.5 py-1.5 text-pm-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60"
                />
              </div>
            </div>
          )}

          {}
          {dest === 'project' && !dirty && (
            <p className="text-pm-xs text-content-muted px-1">Nicio modificare de salvat pe fișă.</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-line bg-surface-secondary flex items-center gap-2">
          <Button variant="outline" size="md" onClick={onClose} disabled={saving}>
            Anulează
          </Button>
          <Button size="md" onClick={handleConfirm} disabled={confirmDisabled} className="ml-auto">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Se salvează…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
