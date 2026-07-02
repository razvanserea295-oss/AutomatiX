import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { apiCommand } from '@/api/commands';
import { Page, PageHeader, PageBody, PageToolbar } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Card } from '@/v2/components/ui/card';

type TreeNode = { name: string; cod_piesa?: string; quantity?: number; children?: TreeNode[] };

function TreeList({ nodes, depth = 0 }: { nodes: TreeNode[]; depth?: number }) {
  return (
    <ul className={depth ? 'ml-4 border-l pl-3' : ''}>
      {nodes.map((n, i) => (
        <li key={`${depth}-${i}`} className="py-1 text-sm">
          <span className="font-medium">{n.cod_piesa || n.name}</span>
          {n.quantity != null && <span className="text-muted-foreground"> × {n.quantity}</span>}
          {n.children?.length ? <TreeList nodes={n.children} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

export default function PartsTreePage({ initialProjectId }: { initialProjectId?: number }) {
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const [projectId, setProjectId] = useState<number | null>(initialProjectId ?? null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);
  useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    apiCommand<TreeNode[] | { tree?: TreeNode[] }>('get_project_parts_tree', { project_id: projectId })
      .then((data) => {
        const nodes = Array.isArray(data) ? data : (data?.tree ?? []);
        setTree(nodes);
      })
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <Page fill>
      <PageHeader title="Arbore piese" description="Structura BOM per proiect" />
      <PageBody>
        <PageToolbar>
          <select
            className="h-[var(--density-search-h)] max-w-md rounded-md border border-input bg-background px-3 text-sm"
            value={projectId ?? ''}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Selectează proiect…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </PageToolbar>
        <AsyncContent loading={loading} error={null} empty={!projectId || tree.length === 0} emptyMessage={projectId ? 'Nicio piesă.' : 'Alege un proiect.'}>
          <Card className="v2-panel min-h-0 flex-1 shadow-none">
            <div className="v2-panel-scroll p-[var(--density-card-p)]">
              <TreeList nodes={tree} />
            </div>
          </Card>
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
