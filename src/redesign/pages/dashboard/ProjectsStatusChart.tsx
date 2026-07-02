import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { Project } from '@/core/types';
import { projectStatus } from '@/lib/statusTokens';
import type { StatusTone } from '@/lib/statusTokens';
import { DASH_HERO_CHART_HEIGHT } from './density';

const TONE_COLOR: Record<StatusTone, string> = {
  success: 'var(--status-green)',
  progress: 'var(--status-blue)',
  info: 'var(--status-blue)',
  warning: 'var(--status-amber)',
  danger: 'var(--status-red)',
  special: 'var(--color-accent)',
  accent: 'var(--color-accent)',
  neutral: 'var(--color-text-muted)',
};

interface ProjectsStatusChartProps {
  projects: Project[];
  variant?: 'embedded' | 'hero';
}

export default function ProjectsStatusChart({ projects, variant = 'hero' }: ProjectsStatusChartProps) {
  const data = useMemo(() => {
    const map = new Map<string, { label: string; count: number; fill: string }>();
    for (const p of projects) {
      const token = projectStatus(p.status);
      const key = (p.status || 'unknown').toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          label: token.label,
          count: 1,
          fill: TONE_COLOR[token.tone] ?? TONE_COLOR.neutral,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [projects]);

  const isHero = variant === 'hero';
  const chartHeight = isHero ? `w-full ${DASH_HERO_CHART_HEIGHT}` : 'h-44 w-full lg:min-h-[7rem] lg:flex-1';

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-pm-xs text-content-muted ${chartHeight}`}>
        Fără proiecte de afișat.
      </div>
    );
  }

  return (
    <div className={`w-full ${chartHeight}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: isHero ? 24 : 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-muted)', fontSize: isHero ? 11 : 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            interval={0}
            angle={data.length > 5 ? -24 : 0}
            textAnchor={data.length > 5 ? 'end' : 'middle'}
            height={data.length > 5 ? 48 : 28}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-tertiary)', opacity: 0.35 }}
            contentStyle={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--color-text-primary)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            }}
            formatter={(value: number) => [value, 'Proiecte']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={750} animationEasing="ease-out">
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
