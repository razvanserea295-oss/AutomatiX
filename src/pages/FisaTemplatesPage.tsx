/**
 * Fișă templates management.
 *
 * Lists every global template, lets users:
 *   - Create a NEW template by cloning an existing one (the safest path
 *     — gives them a working schema to mutate).
 *   - Rename / edit the description / sort order.
 *   - Edit the JSON schema directly (advanced — for users comfortable
 *     with the structure). Future iterations can replace this with a
 *     visual editor; for now it's a textarea with validation.
 *   - Soft-delete (admin / author only).
 *
 * Templates are GLOBAL so the audience of this page is everyone, but
 * the action buttons gate themselves by ownership.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardCheck, Plus, Pencil, Trash2, Copy, Star, Loader2,
  CheckCircle2, User as UserIcon,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import FisaTemplateEditor from './checklist/FisaTemplateEditor';
import { getErrorMessage } from '@/utils/errors';

interface Template {
  id: number;
  name: string;
  description: string | null;
  schema_json: string;
  created_by_user_id: number | null;
  created_by_name: string | null;
  is_default: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function FisaTemplatesPage() {
  const me = useAuthStore(s => s.user);
  const isAdmin = me?.role_name === 'admin';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await apiCommand<Template[]>('get_fisa_templates'));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Eroare'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  
  const stats = useMemo(() => ({
    total: templates.length,
    active: templates.filter(t => t.active).length,
    implicit: templates.filter(t => t.is_default).length,
    mine: templates.filter(t => t.created_by_user_id === me?.id).length,
  }), [templates, me?.id]);

  const canEdit = (t: Template) => isAdmin || t.created_by_user_id === me?.id;

  const clone = async (t: Template) => {
    const name = prompt('Numele noului template:', `${t.name} (copie)`);
    if (!name) return;
    try {
      await apiCommand('clone_fisa_template', { id: t.id, new_name: name });
      toast.success('Template clonat');
      refresh();
    } catch (e: unknown) { toast.error(getErrorMessage(e, 'Eroare')); }
  };
  const remove = async (t: Template) => {
    if (!confirm(`Sigur dezactivezi "${t.name}"? Fișele existente nu sunt afectate.`)) return;
    try {
      await apiCommand('delete_fisa_template', { id: t.id });
      toast.success('Template dezactivat');
      refresh();
    } catch (e: unknown) { toast.error(getErrorMessage(e, 'Eroare')); }
  };

  return (
    <Page className="mod-shell">
      {}
      <div className="px-5 pt-4 pb-8 space-y-4 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Proiectare"
          icon={ClipboardCheck}
          title="Template-uri fișa proiectant"
          subtitle="Catalog global de structuri pentru fișe — clonate pe fiecare proiect (Q8 snapshot)"
          actions={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" /> Template nou
            </Button>
          }
        />
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={ClipboardCheck} label="Total template-uri" value={stats.total} />
          <KpiMini icon={CheckCircle2}   label="Active"             value={stats.active} />
          <KpiMini icon={Star}           label="Implicite"          value={stats.implicit} />
          <KpiMini icon={UserIcon}       label="Ale mele"           value={stats.mine} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-content-muted" /></div>
        ) : templates.length === 0 ? (
          <p className="text-pm-sm text-content-muted text-center py-8">Niciun template configurat.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl">
            {templates.map(t => (
              <GlassCard key={t.id} className="hover-lift p-4 flex flex-col">
                <div className="flex items-start gap-2 mb-2">
                  <ClipboardCheck className="h-4 w-4 text-content-muted mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-pm-sm font-semibold text-content-primary">{t.name}</p>
                    {t.is_default && (
                      <span className="inline-flex items-center gap-1 text-pm-2xs bg-accent/10 text-accent px-1.5 py-0.5 rounded mt-1">
                        <Star className="h-2.5 w-2.5" /> Implicit
                      </span>
                    )}
                  </div>
                </div>
                {t.description && <p className="text-pm-xs text-content-muted flex-1 mb-3 line-clamp-3">{t.description}</p>}
                {t.created_by_name && (
                  <p className="text-pm-2xs text-content-muted/70 mb-3">creat de {t.created_by_name}</p>
                )}

                <div className="flex items-center gap-1 mt-auto pt-2 border-t border-line/40">
                  <button onClick={() => clone(t)} title="Clonează"
                    className="h-7 w-7 rounded hover:bg-surface-tertiary text-content-muted hover:text-content-primary flex items-center justify-center">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {canEdit(t) && (
                    <>
                      <button onClick={() => setEditing(t)} title="Editează"
                        className="h-7 w-7 rounded hover:bg-surface-tertiary text-content-muted hover:text-content-primary flex items-center justify-center">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {!t.is_default && (
                        <button onClick={() => remove(t)} title="Dezactivează"
                          className="h-7 w-7 rounded hover:bg-status-red/10 text-content-muted hover:text-status-red flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <FisaTemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {creating && (
        <FisaTemplateEditor
          template={null}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); refresh(); }}
        />
      )}
    </Page>
  );
}


function KpiMini({ icon: Icon, label, value, warn }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}

