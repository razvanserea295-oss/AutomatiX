// Cross-cutting "this firm needs a license" signal. Any command that returns
// HTTP 402 { requires_license:true } (the per-tenant gate in server/index.ts)
// fires this; the auth store listens and flips into the activation screen.

export function notifyLicenseRequired(): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('promix:license-required'));
}

export function addLicenseRequiredListener(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  window.addEventListener('promix:license-required', callback);
  return () => window.removeEventListener('promix:license-required', callback);
}
