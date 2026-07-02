import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { confirmDialog } from '@/components/ConfirmDialog';
import { useProjectStore } from '@/store/projectStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { Page, PageHeader } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import StatusBadge from '@/v2/components/app/StatusBadge';
import { Button } from '@/v2/components/ui/button';
import { Card, CardContent } from '@/v2/components/ui/card';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';

interface Checklist {
  id: number;
  project_name: string;
  designer_name: string;
  status: string;
  revision: number;
  tracking_json: string;
  specs_json: string;
}

interface Sub {
  id: string;
  name: string;
  proiect: boolean;
  dxf: boolean;
  desene: boolean;
  executie: boolean;
  livrat: boolean;
}
interface Assembly {
  id: string;
  assembly: string;
  subs: Sub[];
}

interface SpecField { key: string; label: string; value: unknown; type: string; options?: string[] }
interface SpecSection { id: string; title: string; fields: SpecField[] }
interface Specs { header: Record<string, string>; sections: SpecSection[]; aprobat_beneficiar: Record<string, string> }

const TRACK_COLS: { key: keyof Sub; label: string }[] = [
  { key: 'proiect', label: 'Proiect' },
  { key: 'dxf', label: 'DXF' },
  { key: 'desene', label: 'Desene' },
  { key: 'executie', label: 'Execuție' },
  { key: 'livrat', label: 'Livrat' },
];

type ViewTab = 'tracking' | 'specs';

function parseTracking(json: string): Assembly[] {
  try {
    const parsed = JSON.parse(json) as Assembly[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSpecs(json: string): Specs | null {
  try {
    return JSON.parse(json) as Specs;
  } catch {
    return null;
  }
}

function calcProgress(tracking: Assembly[]): number {
  let total = 0;
  let done = 0;
  for (const asm of tracking) {
    for (const sub of asm.subs || []) {
      for (const k of TRACK_COLS) {
        total++;
        if (sub[k.key]) done++;
      }
    }
  }
  return total ? Math.round((done / total) * 100) : 0;
}

export default function FisaProiectantPage() {
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const refreshProjects = useProjectStore((s) => s.refreshAll);

  const [projectId, setProjectId] = useState<number | ''>('');
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [tracking, setTracking] = useState<Assembly[]>([]);
  const [specs, setSpecs] = useState<Specs | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('tracking');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = checklist?.status !== 'finalized';

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  const load = useCallback((pid: number) => {
    setLoading(true);
    apiCommand<Checklist>('get_checklist_by_project', { project_id: pid })
      .then((c) => {
        setChecklist(c);
        setTracking(parseTracking(c.tracking_json));
        setSpecs(parseSpecs(c.specs_json));
      })
      .catch(() => {
        setChecklist(null);
        setTracking([]);
        setSpecs(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (projectId) load(Number(projectId));
    else {
      setChecklist(null);
      setTracking([]);
      setSpecs(null);
    }
  }, [projectId, load]);

  const progress = useMemo(() => calcProgress(tracking), [tracking]);

  const toggle = (asmIdx: number, subIdx: number, key: keyof Sub) => {
    if (!canEdit) return;
    setTracking((prev) =>
      prev.map((asm, ai) =>
        ai !== asmIdx ? asm : {
          ...asm,
          subs: asm.subs.map((sub, si) =>
            si !== subIdx ? sub : { ...sub, [key]: !sub[key] },
          ),
        },
      ),
    );
  };

  const updateSpecField = (sectionIdx: number, fieldIdx: number, value: string) => {
    if (!specs || !canEdit) return;
    const updated = { ...specs, sections: [...specs.sections] };
    updated.sections[sectionIdx] = {
      ...updated.sections[sectionIdx],
      fields: [...updated.sections[sectionIdx].fields],
    };
    updated.sections[sectionIdx].fields[fieldIdx] = {
      ...updated.sections[sectionIdx].fields[fieldIdx],
      value,
    };
    setSpecs(updated);
  };

  const save = async (finalize = false): Promise<boolean> => {
    if (!checklist) return false;
    setSaving(true);
    try {
      const c = await apiCommand<Checklist>('update_checklist', {
        id: checklist.id,
        tracking_json: JSON.stringify(tracking),
        specs_json: JSON.stringify(specs ?? parseSpecs(checklist.specs_json)),
        ...(finalize ? { status: 'finalized' } : {}),
      });
      setChecklist(c);
      setTracking(parseTracking(c.tracking_json));
      setSpecs(parseSpecs(c.specs_json));
      toast.success(finalize ? 'Fișă finalizată — proiectul trece în producție' : 'Fișă salvată');
      if (finalize) {
        await refreshProjects();
        useDashboardStore.getState().invalidate();
      }
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!checklist) return;
    const ok = await confirmDialog({
      title: 'Finalizezi fișa?',
      body: 'Proiectul va trece în producție. Această acțiune marchează fișa ca finalizată.',
      confirmLabel: 'Finalizează',
    });
    if (!ok) return;
    await save(true);
  };

  const createFromTemplate = async () => {
    if (!projectId) return;
    try {
      const templates = await apiCommand<{ id: number; name: string }[]>('get_fisa_templates');
      const t = Array.isArray(templates) ? templates[0] : null;
      if (!t) { toast.error('Niciun template disponibil'); return; }
      const c = await apiCommand<Checklist>('create_checklist', {
        project_id: Number(projectId),
        template_id: t.id,
      });
      setChecklist(c);
      setTracking(parseTracking(c.tracking_json));
      setSpecs(parseSpecs(c.specs_json));
      toast.success('Fișă creată');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  return (
    <Page fill>
      <PageHeader
        title="Fișă proiectant"
        description="Checklist proiectare — tracking și specificații"
        actions={
          checklist ? (
            <div className="flex gap-2">
              {canEdit && (
                <Button size="sm" variant="outline" disabled={saving} onClick={() => void finalize()}>
                  Finalizează
                </Button>
              )}
              <Button size="sm" disabled={saving || !canEdit} onClick={() => void save(false)}>
                <Save className="mr-2 h-4 w-4" />{saving ? 'Se salvează…' : 'Salvează'}
              </Button>
            </div>
          ) : projectId ? (
            <Button size="sm" variant="outline" onClick={() => void createFromTemplate()}>Creează fișă</Button>
          ) : undefined
        }
      />

      <div className="grid gap-1.5 max-w-sm mb-4">
        <Label>Proiect</Label>
        <select className="h-9 rounded-md border px-3 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Selectează proiect…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <AsyncContent loading={loading} error={null} empty={!!projectId && !checklist}>
        {checklist && (
          <div className="space-y-4">
            <Card className="shadow-none">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <h3 className="font-semibold">{checklist.project_name}</h3>
                  <p className="text-sm text-muted-foreground">{checklist.designer_name} · Rev. {checklist.revision}</p>
                </div>
                <StatusBadge status={checklist.status} />
                <div className="w-full sm:w-48">
                  <p className="text-xs mb-1">Progres {progress}%</p>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs>
              <TabsList>
                <TabsTrigger active={viewTab === 'tracking'} onClick={() => setViewTab('tracking')}>Tracking</TabsTrigger>
                <TabsTrigger active={viewTab === 'specs'} onClick={() => setViewTab('specs')}>Specificații</TabsTrigger>
              </TabsList>
            </Tabs>

            {viewTab === 'tracking' && (
              tracking.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nicio asamblare în tracking.</p>
              ) : (
                tracking.map((asm, ai) => (
                  <Card key={asm.id || ai} className="shadow-none overflow-hidden">
                    <CardContent className="p-0">
                      <p className="px-4 py-2 font-medium border-b bg-muted/30">{asm.assembly}</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Piesă</TableHead>
                            {TRACK_COLS.map((c) => <TableHead key={c.key} className="text-center w-16">{c.label}</TableHead>)}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(asm.subs || []).map((sub, si) => (
                            <TableRow key={sub.id || si}>
                              <TableCell>{sub.name}</TableCell>
                              {TRACK_COLS.map((c) => (
                                <TableCell key={c.key} className="text-center">
                                  <input
                                    type="checkbox"
                                    disabled={!canEdit}
                                    checked={!!sub[c.key]}
                                    onChange={() => toggle(ai, si, c.key)}
                                  />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))
              )
            )}

            {viewTab === 'specs' && (
              !specs || specs.sections.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nicio specificație definită.</p>
              ) : (
                specs.sections.map((section, si) => (
                  <Card key={section.id || si} className="shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-medium">{section.title}</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {section.fields.map((field, fi) => (
                          <div key={field.key || fi} className="grid gap-1">
                            <Label className="text-xs">{field.label}</Label>
                            {field.type === 'select' && field.options ? (
                              <select
                                className="h-9 rounded-md border px-3 text-sm"
                                disabled={!canEdit}
                                value={String(field.value ?? '')}
                                onChange={(e) => updateSpecField(si, fi, e.target.value)}
                              >
                                <option value="">—</option>
                                {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <Input
                                disabled={!canEdit}
                                value={String(field.value ?? '')}
                                onChange={(e) => updateSpecField(si, fi, e.target.value)}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            )}
          </div>
        )}
      </AsyncContent>
    </Page>
  );
}
