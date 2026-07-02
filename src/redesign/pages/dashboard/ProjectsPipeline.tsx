import type { Project } from '@/core/types';
import { FolderKanban } from '@/icons';
import { formatDateRo } from '@/lib/format';
import { projectStatus } from '@/lib/statusTokens';
import { Panel } from '@/app-ui';
import EmptyState from '@/redesign/ui/EmptyState';
import StatusBadge from '@/redesign/ui/StatusBadge';
import type { NavigateFn } from './types';
import { DASH_EMPTY, DASH_LIST, DASH_LIST_ROW, DASH_PANEL } from './density';

interface ProjectsPipelineProps {
  canProjects: boolean;
  activeCount: number;
  totalCount: number;
  projects: Project[];
  onNavigate: NavigateFn;
}

function deadlineLabel(deadline: string | null | undefined): string {
  if (!deadline) return 'fără termen';
  const today = new Date().toISOString().slice(0, 10);
  const formatted = formatDateRo(deadline);
  if (deadline < today) return `Depășit · ${formatted}`;
  return formatted;
}

export default function ProjectsPipeline({
  canProjects,
  activeCount,
  totalCount,
  projects,
  onNavigate,
}: ProjectsPipelineProps) {
  return (
    <Panel
      title="Proiecte active"
      subtitle={canProjects ? `${activeCount} din ${totalCount} în lucru` : 'Fără acces la portofoliu'}
      fill
      scroll
      className={DASH_PANEL}
      actions={canProjects ? (
        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="text-pm-2xs font-semibold text-accent hover:underline"
        >
          Deschide portofoliul
        </button>
      ) : undefined}
    >
      {!canProjects ? (
        <EmptyState
          icon={FolderKanban}
          title="Fără acces"
          description="Permisiunile tale nu includ portofoliul de proiecte."
          className={DASH_EMPTY}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Niciun proiect activ"
          description="Toate proiectele sunt finalizate sau nu au fost încă pornite."
          className={DASH_EMPTY}
        />
      ) : (
        <ul className={DASH_LIST}>
          {projects.map((p) => {
            const overdue = !!(p.deadline && p.deadline < new Date().toISOString().slice(0, 10));
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onNavigate('projects')}
                  className={DASH_LIST_ROW}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-pm-sm font-medium leading-snug text-content-primary">
                      {(p.name || '').replace(/,\s*$/, '')}
                    </p>
                    <p className="truncate text-pm-2xs leading-snug text-content-muted">
                      {p.client_name || '—'}
                      {' · '}
                      <span className={overdue ? 'font-medium text-status-red' : ''}>
                        {deadlineLabel(p.deadline)}
                      </span>
                    </p>
                  </div>
                  <StatusBadge {...projectStatus(p.stage || p.status)} size="xs" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
