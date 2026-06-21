import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Button, Select, Option, BusyIndicator,
} from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { useProjectStore } from '@/store/projectStore';
import { usePieceStore, usePiecesForProject } from '@/store/pieceStore';
import type { ProjectPiece } from '@/types/piece';
import Ui5ClassicControl from '@/fiori/classic/Ui5ClassicControl';
import type { SapGlobal } from '@/fiori/classic/ui5Loader';
import type { User } from '@/core/types';

// Raw hierarchical node returned by the `get_project_parts_tree` command — the same
// source the SaaS PartsTreePage consumes. We mirror its field names exactly.
interface RawTreeNode {
  name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category: string;
  supplier_code?: string | null;
  children: RawTreeNode[];
}

// Shape consumed by the classic TreeTable model. `children` is the child field the
// TreeTable binds to; quantity/material/status are enriched from the project pieces.
interface TreeRow {
  denumire: string;
  cod: string;
  cantitate: string;
  material: string;
  status: string;
  children: TreeRow[];
}

const stateForStatus: Record<string, string> = {
  finalizat: 'Success', finalizata: 'Success', livrat: 'Success', livrata: 'Success',
  'in lucru': 'Warning', 'in productie': 'Warning', partial: 'Warning',
  anulat: 'Error', anulata: 'Error', blocat: 'Error',
};

// Build a lookup so each tree node can be enriched with the matching piece's
// quantity / material (specs) / status, mirroring how the SaaS page links nodes to
// pieces (by name or source file name).
function buildPieceIndex(pieces: ProjectPiece[]): Map<string, ProjectPiece> {
  const idx = new Map<string, ProjectPiece>();
  for (const p of pieces) {
    if (p.name) idx.set(p.name.toLowerCase(), p);
    if (p.source_file_name) idx.set(p.source_file_name.toLowerCase(), p);
  }
  return idx;
}

function toTreeRows(nodes: RawTreeNode[], idx: Map<string, ProjectPiece>): TreeRow[] {
  return nodes.map((n) => {
    const match = idx.get(n.name.toLowerCase()) || idx.get(n.file_name.toLowerCase());
    return {
      denumire: n.name,
      cod: n.supplier_code || n.file_name || '-',
      cantitate: match ? String(match.quantity ?? 1) : '-',
      material: match?.specs || n.category || '-',
      status: match?.status || '-',
      children: toTreeRows(n.children, idx),
    };
  });
}

// Builds a REAL classic SAPUI5 sap.ui.table.TreeTable bound to the JSONModel the
// wrapper creates from our `data` prop. Children are nested on the `children` field.
function buildTreeTable(sap: SapGlobal, model: SapGlobal | null): SapGlobal {
  const col = (label: string, prop: string, width: string) =>
    new sap.ui.table.Column({
      label: new sap.m.Label({ text: label }),
      width,
      template: new sap.m.Text({ text: `{${prop}}`, wrapping: false }),
    });

  const statusTemplate = new sap.m.ObjectStatus({
    text: '{status}',
    state: {
      path: 'status',
      formatter: (s: string) => stateForStatus[(s || '').toLowerCase().trim()] || 'None',
    },
  });

  const table = new sap.ui.table.TreeTable({
    selectionMode: 'Single',
    enableColumnReordering: true,
    visibleRowCountMode: 'Auto',
    columns: [
      new sap.ui.table.Column({
        label: new sap.m.Label({ text: 'Denumire' }),
        width: '40%',
        template: new sap.m.Text({ text: '{denumire}', wrapping: false }),
      }),
      col('Cod', 'cod', '18%'),
      col('Cantitate', 'cantitate', '12%'),
      col('Material', 'material', '18%'),
      new sap.ui.table.Column({
        label: new sap.m.Label({ text: 'Status' }),
        width: '12%',
        template: statusTemplate,
      }),
    ],
  });

  if (model) {
    table.setModel(model);
    table.bindRows({ path: '/', parameters: { arrayNames: ['children'] } });
  }
  return table;
}

export default function FioriPartsTree({ user }: { user: User }) {
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const fetchPieces = usePieceStore((s) => s.fetchPieces);

  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [treeNodes, setTreeNodes] = useState<RawTreeNode[]>([]);
  const [loading, setLoading] = useState(false);

  const pieces = usePiecesForProject(selectedProject);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  // Default to the first project the logged-in user can see.
  useEffect(() => {
    if (selectedProject == null && projects.length > 0) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  // Load the pieces for the selected project through the required pieceStore.
  useEffect(() => {
    if (selectedProject != null) void fetchPieces(selectedProject);
  }, [selectedProject, fetchPieces]);

  const loadTree = useCallback(() => {
    if (selectedProject == null) { setTreeNodes([]); return; }
    setLoading(true);
    apiCommand<RawTreeNode[] | { tree?: RawTreeNode[] }>('get_project_parts_tree', { project_id: selectedProject })
      .then((r) => {
        const data = Array.isArray(r)
          ? r
          : Array.isArray((r as { tree?: RawTreeNode[] }).tree)
            ? (r as { tree?: RawTreeNode[] }).tree!
            : [];
        setTreeNodes(data);
      })
      .catch(() => setTreeNodes([]))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  useEffect(loadTree, [loadTree]);

  const treeData = useMemo<TreeRow[]>(() => {
    const idx = buildPieceIndex(pieces);
    return toTreeRows(treeNodes, idx);
  }, [treeNodes, pieces]);

  const projectName = useMemo(
    () => projects.find((p) => p.id === selectedProject)?.name ?? '',
    [projects, selectedProject],
  );

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Arbore repere</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Select
            onChange={(e) => {
              const id = Number(e.detail.selectedOption.dataset.id);
              setSelectedProject(Number.isFinite(id) ? id : null);
            }}
          >
            {projects.map((p) => (
              <Option key={p.id} data-id={p.id} selected={p.id === selectedProject}>
                {p.name}{p.client_name ? ` — ${p.client_name}` : ''}
              </Option>
            ))}
          </Select>
          <Button design="Emphasized" onClick={loadTree} disabled={selectedProject == null}>
            Reîncarcă
          </Button>
          {user.role_name === 'admin' && (
            <Button design="Transparent" disabled>
              {projectName ? `Proiect: ${projectName}` : 'Niciun proiect'}
            </Button>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <BusyIndicator active size="L" />
            </div>
          ) : treeData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--sapContent_LabelColor)' }}>
              Fără date
            </div>
          ) : (
            <Ui5ClassicControl
              height="100%"
              data={treeData}
              create={(sap, { model }) => buildTreeTable(sap, model)}
            />
          )}
        </div>
      </div>
    </DynamicPage>
  );
}
