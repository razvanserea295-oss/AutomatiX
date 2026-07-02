


















export const filterSearchInputCls =
  'h-10 w-56 bg-surface-primary border border-line rounded-xl pl-9 pr-8 text-pm-sm text-content-primary placeholder:text-content-muted/70 transition-smooth duration-150 focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)] focus:shadow-[var(--ring-soft)] hover:border-content-muted/50';


export const filterSearchIconCls =
  'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted pointer-events-none transition-colors group-focus-within:text-accent';


export const filterClearInlineBtnCls =
  'absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-tertiary transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-40';






export function filterSelectCls(active: boolean): string {
  return `h-10 bg-surface-primary border rounded-xl px-3 text-pm-sm transition-smooth duration-150 cursor-pointer active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)] focus:shadow-[var(--ring-soft)] hover:border-content-muted/50 ${
    active ? 'border-accent/40 bg-accent-muted text-content-primary font-medium' : 'border-line text-content-secondary'
  }`;
}


export const filterDateInputCls =
  'h-10 bg-surface-primary border border-line rounded-xl px-3 text-pm-sm text-content-secondary transition-smooth duration-150 cursor-pointer focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)] focus:shadow-[var(--ring-soft)] hover:border-content-muted/50';


export const filterResetBtnCls =
  'h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-pm-sm text-content-muted hover:text-status-red hover:bg-status-red/8 transition-smooth duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]';






export function filterToggleCls(active: boolean): string {
  return `h-10 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl text-pm-sm whitespace-nowrap transition-smooth duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
    active
      ? 'border border-accent/40 bg-accent-muted text-accent font-medium'
      : 'border border-line text-content-secondary hover:border-content-muted/50 hover:text-content-primary'
  }`;
}
