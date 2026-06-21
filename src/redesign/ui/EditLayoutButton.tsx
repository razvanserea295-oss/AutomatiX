import { Pencil, Check } from 'lucide-react';
import { useLayoutEditStore } from '@/store/layoutEditStore';

/**
 * One page-wide "Editează / Gata" toggle for card positioning. Drop it into a
 * page header; it flips the global edit mode that every <CardGrid> on the page
 * reads. Auto-resets to off on route change (see App.tsx).
 */
export default function EditLayoutButton({ className = '' }: { className?: string }) {
  const editMode = useLayoutEditStore((s) => s.editMode);
  const toggle = useLayoutEditStore((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      title={editMode ? 'Termină rearanjarea' : 'Rearanjează cardurile'}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-pm-sm font-semibold transition-smooth active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
        editMode
          ? 'bg-accent text-on-accent hover:brightness-110'
          : 'border border-line bg-surface-primary text-content-secondary hover:bg-surface-tertiary'
      } ${className}`}
    >
      {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
      <span className="hidden sm:inline">{editMode ? 'Gata' : 'Editează'}</span>
    </button>
  );
}
