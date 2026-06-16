import { BellOff, Clock } from 'lucide-react';
import Popover from './Popover';
import Button from '@/components/ui/Button';

interface SnoozeMenuProps {
  onSnooze: (untilIso: string) => void;
  size?: 'sm' | 'md';
}

const presets: Array<{ label: string; ms: number }> = [
  { label: '1 oră',     ms: 60 * 60 * 1000 },
  { label: '4 ore',     ms: 4 * 60 * 60 * 1000 },
  { label: 'Mâine 9:00', ms: -1 }, 
  { label: '1 zi',      ms: 24 * 60 * 60 * 1000 },
  { label: '1 săptămână', ms: 7 * 24 * 60 * 60 * 1000 },
];

function computeUntil(label: string, ms: number): Date {
  if (label.startsWith('Mâine')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  return new Date(Date.now() + ms);
}

export default function SnoozeMenu({ onSnooze, size = 'sm' }: SnoozeMenuProps) {
  return (
    <Popover
      width={180}
      trigger={
        <Button variant="ghost" size={size} type="button" className="gap-1.5" aria-label="Amână">
          <BellOff className="h-3.5 w-3.5" /> Amână
        </Button>
      }
    >
      {(close) => (
        <div className="py-1">
          {presets.map(p => (
            <button
              key={p.label}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-pm-base hover:bg-surface-tertiary text-content-secondary"
              onClick={() => { onSnooze(computeUntil(p.label, p.ms).toISOString()); close(); }}
            >
              <Clock className="h-3.5 w-3.5" /> {p.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
