import { useEffect, useMemo, useState } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, AnalyticalTable, BusyIndicator,
  Select, Option, Button, ObjectStatus, Label,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition } from '@ui5/webcomponents-react';
import { usePieceStore } from '@/store/pieceStore';
import { useProjectStore } from '@/store/projectStore';
import { statusState } from '@/fiori/lib/statusState';
import type { ProjectPiece } from '@/types/piece';
import type { User } from '@/core/types';

// Fișa proiectantului — read-only Fiori view of a project's pieces/operations
// (reperele fișei). Reuses pieceStore (get_project_pieces) + projectStore.
export default function FioriFisaProiectant({ user }: { user: User }) {
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);

  const piecesByProject = usePieceStore(s => s.piecesByProject);
  const loadingByProject = usePieceStore(s => s.loadingByProject);
  const fetchPieces = usePieceStore(s => s.fetchPieces);

  const [projectId, setProjectId] = useState<number | null>(null);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  // Auto-select the first project once the list arrives.
  useEffect(() => {
    if (projectId == null && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId]);

  useEffect(() => {
    if (projectId != null) void fetchPieces(projectId);
  }, [projectId, fetchPieces]);

  const rows: ProjectPiece[] = projectId != null ? (piecesByProject[projectId] ?? []) : [];
  const loading = projectId != null ? !!loadingByProject[projectId] : false;
  const selectedProject = useMemo(
    () => projects.find(p => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    { Header: 'Reper', accessor: 'name', minWidth: 200 },
    {
      Header: 'Ansamblu', accessor: 'assembly_key', width: 130,
      Cell: ({ value }) => (value ? String(value) : '—'),
    },
    { Header: 'Categorie', accessor: 'category', width: 140 },
    {
      Header: 'Etapă', accessor: 'stage_name', width: 160,
      Cell: ({ value }) => (value ? String(value) : '—'),
    },
    {
      Header: 'Cant.', accessor: 'quantity', width: 90, hAlign: 'End',
      Cell: ({ value }) => Number(value ?? 0).toLocaleString('ro-RO'),
    },
    {
      Header: 'Status', accessor: 'status', width: 150,
      Cell: ({ value }) => {
        const s = value != null ? String(value) : '';
        return <ObjectStatus state={statusState(s)}>{s || '—'}</ObjectStatus>;
      },
    },
    {
      Header: 'Onorare', accessor: 'fulfillment_status', width: 150,
      Cell: ({ value }) => {
        const s = value != null ? String(value) : '';
        return <ObjectStatus state={statusState(s)}>{s || '—'}</ObjectStatus>;
      },
    },
    {
      Header: 'Actualizat', accessor: 'updated_at', width: 160,
      Cell: ({ value }) =>
        value ? new Date(String(value)).toLocaleString('ro-RO') : '—',
    },
  ], []);

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Fișa proiectant</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Label>Proiect:</Label>
          <Select
            style={{ minWidth: '260px' }}
            onChange={e => {
              const id = Number(e.detail.selectedOption.dataset.id);
              if (Number.isFinite(id)) setProjectId(id);
            }}
          >
            {projects.map(p => (
              <Option key={p.id} data-id={p.id} selected={p.id === projectId}>
                {p.name}
              </Option>
            ))}
          </Select>
          <Button
            design="Transparent"
            icon="refresh"
            disabled={projectId == null || loading}
            onClick={() => { if (projectId != null) void fetchPieces(projectId, true); }}
          >
            Reîmprospătează
          </Button>
          <span style={{ flex: 1 }} />
          <Label>
            {selectedProject ? `${rows.length} repere · ${user.full_name ?? user.username}` : ''}
          </Label>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : (
          <AnalyticalTable
            data={rows}
            columns={columns}
            filterable
            sortable
            visibleRows={15}
            noDataText="Fără date"
          />
        )}
      </div>
    </DynamicPage>
  );
}
