/** CSS class names for optimistic UI row states — pair with loading.css animations. */
export const optimisticClasses = {
  rowUpdating: 'ix-row-updating',
  rowNew: 'ix-row-new',
  rowDeleting: 'ix-row-deleting',
  rowUndo: 'ix-row-undo',
  savingHint: 'ix-saving-hint',
} as const;

export type OptimisticRowState = keyof typeof optimisticClasses;

export function optimisticRowClass(state?: OptimisticRowState | OptimisticRowState[]): string {
  if (!state) return '';
  const states = Array.isArray(state) ? state : [state];
  return states.map(s => optimisticClasses[s]).join(' ');
}
