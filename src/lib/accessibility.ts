



export function isFocusVisible(event: React.FocusEvent<any>): boolean {
  const { currentTarget } = event;
  return (
    currentTarget.matches(':focus-visible') ||
    (currentTarget as any).dataset.focusVisible === 'true'
  );
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(container.querySelectorAll(focusableSelectors));
}

export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  const activeElement = document.activeElement as HTMLElement;
  if (event.shiftKey) {
    if (activeElement === firstElement) { event.preventDefault(); lastElement.focus(); }
  } else {
    if (activeElement === lastElement) { event.preventDefault(); firstElement.focus(); }
  }
}

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => { document.body.removeChild(el); }, 1000);
}
