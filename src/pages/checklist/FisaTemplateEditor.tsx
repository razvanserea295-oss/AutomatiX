






















import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, GripVertical, X, Loader2, CheckSquare, FileText, Save, Scale } from '@/icons';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { FISA_COLUMNS, type FisaColumn, type ColumnWeights, equalWeights, parseColumnWeights } from '@/lib/fisaProgress';

type FieldType = 'text' | 'textarea' | 'checkbox' | 'select';

interface SubAssembly { id: string; name: string; }
interface Assembly { id: string; assembly: string; subs: SubAssembly[]; }
interface SpecField { key: string; label: string; type: FieldType; options?: string[]; value?: unknown; }
interface SpecSection { id: string; title: string; fields: SpecField[]; }
interface Schema {
  tracking: Assembly[];
  specs: {
    header: Record<string, string>;
    sections: SpecSection[];
  };
}

interface TemplateLite {
  id: number;
  name: string;
  description: string | null;
  schema_json: string;
  
  column_weights_json?: string | null;
  is_default: boolean;
}

interface Props {
  template: TemplateLite | null; 
  onClose: () => void;
  onSaved: () => void;
}

const FIVE_LABELS = ['PROIECT', 'DXF', 'DESENE', 'EXECUTIE', 'LIVRAT'];


const COLUMN_LABELS: Record<FisaColumn, string> = {
  proiect: 'Proiectare',
  dxf: 'DXF',
  desene: 'Desene',
  executie: 'Execuție',
  livrat: 'Livrat',
};

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text',     label: 'Text scurt' },
  { value: 'textarea', label: 'Text lung' },
  { value: 'checkbox', label: 'Bifă' },
  { value: 'select',   label: 'Listă (opțiuni)' },
];

const EMPTY_SCHEMA: Schema = {
  tracking: [],
  specs: {
    header: {
      tip_statie: '', loc: '', beneficiar: '', completat: '',
      ing_proiect: '', data_inceput: '', data_finalizare: '',
    },
    sections: [],
  },
};

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'camp';
}

function newId(prefix: string): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 7);
}

export default function FisaTemplateEditor({ template, onClose, onSaved }: Props) {
  const isEdit = template !== null;
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [tab, setTab] = useState<'tracking' | 'specs'>('tracking');
  const [schema, setSchema] = useState<Schema>(EMPTY_SCHEMA);
  const [saving, setSaving] = useState(false);
  
  
  
  const [weights, setWeights] = useState<ColumnWeights>(equalWeights());

  
  useEffect(() => {
    if (!template?.schema_json) { setSchema(EMPTY_SCHEMA); }
    else {
      try {
        const parsed = JSON.parse(template.schema_json);
        setSchema({
          tracking: Array.isArray(parsed.tracking) ? parsed.tracking : [],
          specs: {
            header: parsed.specs?.header || EMPTY_SCHEMA.specs.header,
            sections: Array.isArray(parsed.specs?.sections) ? parsed.specs.sections : [],
          },
        });
      } catch {
        setSchema(EMPTY_SCHEMA);
      }
    }
    
    setWeights(parseColumnWeights(template?.column_weights_json ?? null) ?? equalWeights());
  }, [template?.id]);

  
  const weightTotal = useMemo(
    () => FISA_COLUMNS.reduce((s, c) => s + (Number(weights[c]) || 0), 0),
    [weights],
  );
  const weightsValid = Math.abs(weightTotal - 100) < 0.001;
  const weightDelta = Math.round((100 - weightTotal) * 100) / 100;

  const setWeight = (col: FisaColumn, raw: string) => {
    const v = raw === '' ? 0 : Number(raw);
    setWeights(w => ({ ...w, [col]: Number.isFinite(v) && v >= 0 ? v : 0 }));
  };
  
  const distributeEvenly = () => setWeights(equalWeights());

  
  const addAssembly = () => {
    setSchema(s => ({
      ...s,
      tracking: [...s.tracking, {
        id: String(s.tracking.length + 1),
        assembly: 'Ansamblu nou',
        subs: [],
      }],
    }));
  };
  const updateAssembly = (idx: number, name: string) => {
    setSchema(s => ({
      ...s,
      tracking: s.tracking.map((a, i) => i === idx ? { ...a, assembly: name } : a),
    }));
  };
  const deleteAssembly = (idx: number) => {
    if (!confirm('Sigur ștergi acest ansamblu? Toate sub-ansamblurile se vor pierde.')) return;
    setSchema(s => ({ ...s, tracking: s.tracking.filter((_, i) => i !== idx) }));
  };
  const addSub = (aIdx: number) => {
    setSchema(s => ({
      ...s,
      tracking: s.tracking.map((a, i) => i === aIdx ? {
        ...a,
        subs: [...a.subs, {
          id: `${a.id}.${a.subs.length + 1}`,
          name: 'Sub-ansamblu',
        }],
      } : a),
    }));
  };
  const updateSub = (aIdx: number, sIdx: number, name: string) => {
    setSchema(s => ({
      ...s,
      tracking: s.tracking.map((a, i) => i !== aIdx ? a : ({
        ...a,
        subs: a.subs.map((sub, j) => j === sIdx ? { ...sub, name } : sub),
      })),
    }));
  };
  const deleteSub = (aIdx: number, sIdx: number) => {
    setSchema(s => ({
      ...s,
      tracking: s.tracking.map((a, i) => i !== aIdx ? a : ({
        ...a, subs: a.subs.filter((_, j) => j !== sIdx),
      })),
    }));
  };

  
  const addSection = () => {
    setSchema(s => ({
      ...s,
      specs: {
        ...s.specs,
        sections: [...s.specs.sections, {
          id: String(s.specs.sections.length + 1),
          title: 'Secțiune nouă',
          fields: [],
        }],
      },
    }));
  };
  const updateSectionTitle = (idx: number, title: string) => {
    setSchema(s => ({
      ...s, specs: { ...s.specs,
        sections: s.specs.sections.map((sec, i) => i === idx ? { ...sec, title } : sec),
      },
    }));
  };
  const deleteSection = (idx: number) => {
    if (!confirm('Sigur ștergi această secțiune? Toate câmpurile se vor pierde.')) return;
    setSchema(s => ({
      ...s, specs: { ...s.specs, sections: s.specs.sections.filter((_, i) => i !== idx) },
    }));
  };
  const addField = (secIdx: number) => {
    setSchema(s => ({
      ...s, specs: { ...s.specs,
        sections: s.specs.sections.map((sec, i) => i !== secIdx ? sec : ({
          ...sec,
          fields: [...sec.fields, {
            key: newId('camp'),
            label: 'Câmp nou',
            type: 'text' as FieldType,
            value: '',
          }],
        })),
      },
    }));
  };
  const updateField = (secIdx: number, fldIdx: number, patch: Partial<SpecField>) => {
    setSchema(s => ({
      ...s, specs: { ...s.specs,
        sections: s.specs.sections.map((sec, i) => i !== secIdx ? sec : ({
          ...sec,
          fields: sec.fields.map((f, j) => {
            if (j !== fldIdx) return f;
            const next = { ...f, ...patch };
            
            
            
            if (patch.label && (!f.key || f.key === slugify(f.label))) {
              next.key = slugify(patch.label);
            }
            
            if (patch.type) {
              if (patch.type === 'checkbox') next.value = false;
              else if (patch.type === 'select') next.value = '';
              else next.value = '';
            }
            return next;
          }),
        })),
      },
    }));
  };
  const deleteField = (secIdx: number, fldIdx: number) => {
    setSchema(s => ({
      ...s, specs: { ...s.specs,
        sections: s.specs.sections.map((sec, i) => i !== secIdx ? sec : ({
          ...sec, fields: sec.fields.filter((_, j) => j !== fldIdx),
        })),
      },
    }));
  };

  
  const save = async () => {
    if (!name.trim()) { toast.error('Numele e obligatoriu'); return; }
    
    if (!weightsValid) {
      toast.error(`Ponderile coloanelor trebuie să însumeze 100% (acum ${weightTotal}%, lipsesc ${weightDelta}%)`);
      setTab('tracking');
      return;
    }
    
    for (const sec of schema.specs.sections) {
      const keys = new Set<string>();
      for (const f of sec.fields) {
        if (!f.key) { toast.error(`Câmp fără key în secțiunea "${sec.title}"`); return; }
        if (keys.has(f.key)) { toast.error(`Key duplicat "${f.key}" în secțiunea "${sec.title}"`); return; }
        keys.add(f.key);
      }
    }

    setSaving(true);
    try {
      
      const weightsOut = FISA_COLUMNS.reduce((acc, c) => {
        acc[c] = Math.round((Number(weights[c]) || 0) * 100) / 100;
        return acc;
      }, {} as ColumnWeights);
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        schema_json: JSON.stringify(schema),
        column_weights_json: JSON.stringify(weightsOut),
      };
      if (isEdit && template) {
        await apiCommand('update_fisa_template', { id: template.id, ...payload });
        toast.success('Template actualizat');
      } else {
        await apiCommand('create_fisa_template', payload);
        toast.success('Template creat');
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Eroare la salvare');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-surface-primary border border-line rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {}
        <div className="px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-pm-lg font-semibold text-content-primary">
              {isEdit ? 'Editare template' : 'Template nou'}
            </h2>
            <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-tertiary text-content-muted">
              <X className="h-4 w-4 m-auto" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Nume *</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="ex: Cântar Auto 60t"
                className="w-full h-9 px-3 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent" />
            </div>
            <div className="col-span-2">
              <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Descriere</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Pentru ce produs / situație?"
                className="w-full h-9 px-3 border border-line bg-surface-primary rounded text-pm-sm focus:outline-none focus:border-accent" />
            </div>
          </div>
        </div>

        {}
        <div className="flex items-center gap-0 border-b border-line shrink-0 bg-surface-secondary px-5">
          <EditorTab active={tab === 'tracking'} onClick={() => setTab('tracking')}>
            <CheckSquare className="h-3.5 w-3.5" /> Tracking ansambluri ({schema.tracking.length})
          </EditorTab>
          <EditorTab active={tab === 'specs'} onClick={() => setTab('specs')}>
            <FileText className="h-3.5 w-3.5" /> Specs tehnice ({schema.specs.sections.length})
          </EditorTab>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-5 bg-surface-page">
          {tab === 'tracking' ? (
            <TrackingEditor
              tracking={schema.tracking}
              onAddAssembly={addAssembly}
              onUpdateAssembly={updateAssembly}
              onDeleteAssembly={deleteAssembly}
              onAddSub={addSub}
              onUpdateSub={updateSub}
              onDeleteSub={deleteSub}
              weights={weights}
              weightTotal={weightTotal}
              weightsValid={weightsValid}
              weightDelta={weightDelta}
              onSetWeight={setWeight}
              onDistributeEvenly={distributeEvenly}
            />
          ) : (
            <SpecsEditor
              sections={schema.specs.sections}
              onAddSection={addSection}
              onUpdateSectionTitle={updateSectionTitle}
              onDeleteSection={deleteSection}
              onAddField={addField}
              onUpdateField={updateField}
              onDeleteField={deleteField}
            />
          )}
        </div>

        {}
        <div className="px-5 py-3 border-t border-line bg-surface-secondary shrink-0 flex items-center gap-2">
          <p className="text-pm-xs text-content-muted">
            {schema.tracking.length} ansambluri · {schema.specs.sections.reduce((s, sec) => s + sec.fields.length, 0)} câmpuri
          </p>
          {!weightsValid && (
            <span className="text-pm-xs font-medium text-status-red">
              Ponderi: {weightTotal}% (trebuie 100%)
            </span>
          )}
          <button onClick={onClose} disabled={saving}
            className="ml-auto h-9 px-4 rounded border border-line text-pm-sm text-content-secondary hover:bg-surface-tertiary disabled:opacity-50">
            Anulează
          </button>
          <button onClick={save} disabled={saving || !name.trim() || !weightsValid}
            title={!weightsValid ? 'Ponderile coloanelor trebuie să însumeze 100%' : undefined}
            className="h-9 px-5 rounded bg-accent text-pm-sm font-semibold text-[var(--color-on-accent)] hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Salvează' : 'Creează template'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2.5 text-pm-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
        active ? 'border-accent text-content-primary' : 'border-transparent text-content-muted hover:text-content-primary'
      }`}>
      {children}
    </button>
  );
}





function TrackingEditor({
  tracking, onAddAssembly, onUpdateAssembly, onDeleteAssembly,
  onAddSub, onUpdateSub, onDeleteSub,
  weights, weightTotal, weightsValid, weightDelta, onSetWeight, onDistributeEvenly,
}: {
  tracking: Assembly[];
  onAddAssembly: () => void;
  onUpdateAssembly: (idx: number, name: string) => void;
  onDeleteAssembly: (idx: number) => void;
  onAddSub: (aIdx: number) => void;
  onUpdateSub: (aIdx: number, sIdx: number, name: string) => void;
  onDeleteSub: (aIdx: number, sIdx: number) => void;
  weights: ColumnWeights;
  weightTotal: number;
  weightsValid: boolean;
  weightDelta: number;
  onSetWeight: (col: FisaColumn, raw: string) => void;
  onDistributeEvenly: () => void;
}) {
  return (
    <div className="space-y-3 max-w-4xl">
      <div className="bg-status-blue/5 border border-status-blue/30 rounded p-3 text-pm-xs text-content-secondary">
        <strong className="text-status-blue">Tracking ansambluri</strong> — matricea cu sub-ansambluri și 5 coloane fixe
        ({FIVE_LABELS.join(', ')}). Adaugi câte ansambluri vrei, fiecare cu sub-ansamblurile lui.
      </div>

      {
}
      <div className="border border-line rounded-md bg-surface-primary overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-tertiary/40 border-b border-line">
          <Scale className="h-4 w-4 text-content-muted shrink-0" />
          <span className="text-pm-sm font-semibold text-content-primary">Ponderi coloane (progres fișă)</span>
          <span
            className={`ml-auto text-pm-xs font-semibold tabular-nums px-2 py-0.5 rounded ${
              weightsValid ? 'bg-status-green/10 text-status-green' : 'bg-status-red/10 text-status-red'
            }`}
          >
            Total: {Math.round(weightTotal * 100) / 100}%
          </span>
          <button
            type="button"
            onClick={onDistributeEvenly}
            title="Împarte egal (20% fiecare)"
            className="text-pm-xs text-accent hover:bg-accent/10 rounded px-2 py-0.5"
          >
            Egalizează
          </button>
        </div>
        <div className="p-3">
          <p className="text-pm-xs text-content-muted mb-2.5">
            Fiecare coloană contribuie cu ponderea ei la procentul de progres al fișei. Suma trebuie să fie exact 100%.
            Lăsate goale / legacy → ponderi egale.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {FISA_COLUMNS.map((c) => (
              <div key={c}>
                <label className="block text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-1">
                  {COLUMN_LABELS[c]}
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={weights[c]}
                    onChange={(e) => onSetWeight(c, e.target.value)}
                    className="w-full h-8 px-2 border border-line bg-surface-primary rounded-l text-pm-sm tabular-nums text-content-primary focus:outline-none focus:border-accent"
                  />
                  <span className="h-8 px-2 inline-flex items-center border border-l-0 border-line rounded-r bg-surface-tertiary/40 text-pm-xs text-content-muted">
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>
          {!weightsValid && (
            <p className="mt-2.5 text-pm-xs font-medium text-status-red">
              {weightDelta > 0
                ? `Mai trebuie distribuite ${weightDelta}% pentru a ajunge la 100%.`
                : `Ai depășit cu ${Math.abs(weightDelta)}% — redu până la 100%.`}
            </p>
          )}
        </div>
      </div>

      {tracking.length === 0 ? (
        <p className="text-pm-sm text-content-muted text-center py-8">Niciun ansamblu. Adaugă unul mai jos.</p>
      ) : tracking.map((a, aIdx) => (
        <div key={a.id || aIdx} className="border border-line rounded-md bg-surface-primary overflow-hidden">
          {}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-tertiary/40 border-b border-line">
            <GripVertical className="h-4 w-4 text-content-muted/50 shrink-0" />
            <span className="text-pm-xs font-mono text-content-muted tabular-nums">{aIdx + 1}.</span>
            <input value={a.assembly}
              onChange={(e) => onUpdateAssembly(aIdx, e.target.value)}
              className="flex-1 h-7 px-2 bg-transparent border border-transparent hover:border-line focus:border-accent rounded text-pm-sm font-semibold text-content-primary focus:outline-none"
              placeholder="Nume ansamblu" />
            <button onClick={() => onDeleteAssembly(aIdx)} title="Șterge ansamblu"
              className="h-7 w-7 rounded hover:bg-status-red/10 text-content-muted hover:text-status-red flex items-center justify-center">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {}
          <div className="p-2 space-y-1">
            {a.subs.length === 0 ? (
              <p className="text-pm-xs text-content-muted/70 text-center py-2">
                Niciun sub-ansamblu. Adaugă unul mai jos.
              </p>
            ) : a.subs.map((sub, sIdx) => (
              <div key={sub.id || sIdx} className="flex items-center gap-2 pl-6">
                <span className="text-pm-2xs font-mono text-content-muted tabular-nums shrink-0">
                  {aIdx + 1}.{sIdx + 1}
                </span>
                <input value={sub.name}
                  onChange={(e) => onUpdateSub(aIdx, sIdx, e.target.value)}
                  className="flex-1 h-7 px-2 bg-transparent border border-transparent hover:border-line focus:border-accent rounded text-pm-xs text-content-primary focus:outline-none"
                  placeholder="Nume sub-ansamblu" />
                <button onClick={() => onDeleteSub(aIdx, sIdx)} title="Șterge"
                  className="h-6 w-6 rounded hover:bg-status-red/10 text-content-muted hover:text-status-red flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button onClick={() => onAddSub(aIdx)}
              className="ml-6 h-7 px-2.5 rounded text-pm-xs text-accent hover:bg-accent/10 flex items-center gap-1">
              <Plus className="h-3 w-3" /> Adaugă sub-ansamblu
            </button>
          </div>
        </div>
      ))}

      <button onClick={onAddAssembly}
        className="w-full h-10 border-2 border-dashed border-line hover:border-accent text-content-secondary hover:text-accent rounded-md flex items-center justify-center gap-1.5 text-pm-sm font-medium transition-colors">
        <Plus className="h-4 w-4" /> Adaugă ansamblu
      </button>
    </div>
  );
}





function SpecsEditor({
  sections, onAddSection, onUpdateSectionTitle, onDeleteSection,
  onAddField, onUpdateField, onDeleteField,
}: {
  sections: SpecSection[];
  onAddSection: () => void;
  onUpdateSectionTitle: (idx: number, title: string) => void;
  onDeleteSection: (idx: number) => void;
  onAddField: (secIdx: number) => void;
  onUpdateField: (secIdx: number, fldIdx: number, patch: Partial<SpecField>) => void;
  onDeleteField: (secIdx: number, fldIdx: number) => void;
}) {
  return (
    <div className="space-y-3 max-w-4xl">
      <div className="bg-status-blue/5 border border-status-blue/30 rounded p-3 text-pm-xs text-content-secondary">
        <strong className="text-status-blue">Specs tehnice</strong> — informații generale (header fix) + secțiuni cu câmpuri custom.
        Câmpurile pot fi text scurt, text lung, bifă sau listă cu opțiuni.
      </div>

      {}
      <div className="border border-line rounded-md bg-surface-tertiary/30 p-3">
        <p className="text-pm-xs font-semibold uppercase tracking-wider text-content-muted mb-2">
          Informații generale (header fix)
        </p>
        <p className="text-pm-xs text-content-muted">
          Tip stație · Locație · Beneficiar · Ing. Proiect · Data început · Data finalizare
        </p>
      </div>

      {sections.length === 0 ? (
        <p className="text-pm-sm text-content-muted text-center py-8">Nicio secțiune. Adaugă una mai jos.</p>
      ) : sections.map((sec, secIdx) => (
        <div key={sec.id || secIdx} className="border border-line rounded-md bg-surface-primary overflow-hidden">
          {}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-tertiary/40 border-b border-line">
            <GripVertical className="h-4 w-4 text-content-muted/50 shrink-0" />
            <span className="text-pm-xs font-mono text-content-muted tabular-nums">{secIdx + 1}.</span>
            <input value={sec.title}
              onChange={(e) => onUpdateSectionTitle(secIdx, e.target.value)}
              className="flex-1 h-7 px-2 bg-transparent border border-transparent hover:border-line focus:border-accent rounded text-pm-sm font-semibold text-content-primary focus:outline-none"
              placeholder="Titlu secțiune" />
            <button onClick={() => onDeleteSection(secIdx)} title="Șterge secțiune"
              className="h-7 w-7 rounded hover:bg-status-red/10 text-content-muted hover:text-status-red flex items-center justify-center">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {}
          <div className="p-2 space-y-2">
            {sec.fields.length === 0 ? (
              <p className="text-pm-xs text-content-muted/70 text-center py-2">
                Niciun câmp. Adaugă unul mai jos.
              </p>
            ) : sec.fields.map((field, fldIdx) => (
              <FieldRow
                key={fldIdx}
                field={field}
                onUpdate={(patch) => onUpdateField(secIdx, fldIdx, patch)}
                onDelete={() => onDeleteField(secIdx, fldIdx)}
              />
            ))}
            <button onClick={() => onAddField(secIdx)}
              className="ml-6 h-7 px-2.5 rounded text-pm-xs text-accent hover:bg-accent/10 flex items-center gap-1">
              <Plus className="h-3 w-3" /> Adaugă câmp
            </button>
          </div>
        </div>
      ))}

      <button onClick={onAddSection}
        className="w-full h-10 border-2 border-dashed border-line hover:border-accent text-content-secondary hover:text-accent rounded-md flex items-center justify-center gap-1.5 text-pm-sm font-medium transition-colors">
        <Plus className="h-4 w-4" /> Adaugă secțiune
      </button>
    </div>
  );
}

function FieldRow({
  field, onUpdate, onDelete,
}: {
  field: SpecField;
  onUpdate: (patch: Partial<SpecField>) => void;
  onDelete: () => void;
}) {
  const isSelect = field.type === 'select';
  return (
    <div className="border border-line/50 rounded p-2 space-y-1.5 bg-surface-tertiary/20">
      <div className="grid grid-cols-12 gap-2 items-center">
        <input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Etichetă (ex: Material)"
          className="col-span-5 h-7 px-2 border border-line bg-surface-primary rounded text-pm-xs text-content-primary focus:outline-none focus:border-accent"
        />
        <input
          value={field.key}
          onChange={(e) => onUpdate({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
          placeholder="key"
          title="Key intern (auto-generat din etichetă)"
          className="col-span-3 h-7 px-2 border border-line/60 bg-surface-primary rounded text-pm-2xs font-mono text-content-muted focus:outline-none focus:border-accent"
        />
        <select
          value={field.type}
          onChange={(e) => onUpdate({ type: e.target.value as FieldType })}
          className="col-span-3 h-7 px-2 border border-line bg-surface-primary rounded text-pm-xs text-content-primary focus:outline-none focus:border-accent"
        >
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={onDelete} title="Șterge câmp"
          className="col-span-1 h-7 rounded hover:bg-status-red/10 text-content-muted hover:text-status-red flex items-center justify-center">
          <X className="h-3 w-3" />
        </button>
      </div>
      {isSelect && (
        <div className="pl-2">
          <label className="block text-pm-2xs text-content-muted mb-0.5">Opțiuni (una pe linie):</label>
          <textarea
            value={(field.options || []).join('\n')}
            onChange={(e) => onUpdate({ options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
            rows={3}
            placeholder={'DA\nNU\nN/A'}
            className="w-full px-2 py-1 border border-line bg-surface-primary rounded text-pm-2xs text-content-primary focus:outline-none focus:border-accent resize-none"
          />
        </div>
      )}
    </div>
  );
}
