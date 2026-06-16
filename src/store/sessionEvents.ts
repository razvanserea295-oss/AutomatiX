export function notifySessionExpired(): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('promix:session-expired'));
}

export function addSessionExpiredListener(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }

  window.addEventListener('promix:session-expired', callback);
  return () => window.removeEventListener('promix:session-expired', callback);
}
