import { Badge } from '@/v2/components/ui/badge';

const MAP: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
  activ: 'success',
  active: 'success',
  finalizat: 'success',
  completed: 'success',
  convertit: 'success',
  blocat: 'danger',
  blocked: 'danger',
  anulat: 'secondary',
  nou: 'default',
  new: 'default',
  in_lucru: 'warning',
  in_progres: 'warning',
  pending: 'warning',
};

export default function StatusBadge({ status }: { status: string }) {
  const key = (status || '').toLowerCase().replace(/\s+/g, '_');
  const variant = MAP[key] ?? 'outline';
  const label = status?.replace(/_/g, ' ') || '—';
  return <Badge variant={variant}>{label}</Badge>;
}
