






import { useMemo } from 'react';
import { Activity } from '@/icons';
import { SectionCard } from '@/components/enhancements';

interface MinimalProject {
  id: number;
  name: string;
  client_name?: string | null;
  deadline?: string | null;
  budget?: number | null;
  status?: string | null;
  stage?: string | null;
  description?: string | null;
}

interface Props { project: MinimalProject | null }






function HealthScoreCard({ project }: { project: MinimalProject }) {
  const score = useMemo(() => {
    let s = 100;
    if (project.deadline) {
      const days = (new Date(project.deadline).getTime() - Date.now()) / 86400_000;
      if (days < 0) s -= 30;
      else if (days < 7) s -= 12;
      else if (days < 30) s -= 4;
    }
    if (project.status === 'blocat') s -= 25;
    if (project.status === 'la_cerere') s -= 8;
    return Math.max(0, Math.min(100, s));
  }, [project]);

  const tone = score >= 75 ? 'text-status-green' : score >= 45 ? 'text-status-amber' : 'text-status-red';
  const toneBg = score >= 75 ? 'bg-status-green' : score >= 45 ? 'bg-status-amber' : 'bg-status-red';

  return (
    <SectionCard title="Health score" icon={Activity} description="Scor automat derivat din deadline + status">
      <div className="flex items-center gap-3">
        <span className={`text-3xl font-semibold tabular-nums ${tone}`}>{score}</span>
        <div className="flex-1">
          <div className="h-2 bg-surface-tertiary/50 rounded overflow-hidden">
            <div className={`h-full ${toneBg}`} style={{ width: `${score}%` }} />
          </div>
          <p className="text-pm-2xs text-content-muted mt-1.5">
            {score >= 75 ? 'Sănătos' : score >= 45 ? 'Atenție necesară' : 'Risc ridicat'}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

export default function ProjectsEnhancements({ project }: Props) {
  if (!project) return null;
  return (
    <section className="mt-6 space-y-4 border-t border-line pt-5">
      <HealthScoreCard project={project} />
    </section>
  );
}
