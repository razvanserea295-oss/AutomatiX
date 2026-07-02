

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits }).format(value || 0);
}

export function formatCurrencyEur(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits,
  }).format(value);
}

export function formatCurrencyRon(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits,
  }).format(value || 0);
}







export function formatMoney(
  value: number,
  _currency?: string | null | undefined,
  maximumFractionDigits?: number,
): string {
  // EUR a fost retras — totul e în lei (RON). Argumentul `currency` e păstrat
  // pentru compatibilitate cu apelurile existente, dar e ignorat: mereu RON.
  return formatCurrencyRon(value || 0, maximumFractionDigits ?? 0);
}







export function convertMoney(
  value: number,
  _from?: string | null | undefined,
  _to?: string | null | undefined,
  _eurRate?: number,
): number {
  // EUR a fost retras — nu mai există conversie inter-valutară. Toate valorile
  // sunt deja în lei (migrarea 134 a convertit datele istorice). Identitate.
  return Number.isFinite(value) ? value : 0;
}










export function parseBackendTimestamp(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  
  if (/Z|[+-]\d{2}:?\d{2}$/.test(iso)) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  
  const normalized = iso.includes('T') ? `${iso}Z` : `${iso.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) {
    
    const fallback = new Date(iso);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return d;
}

export function formatDateRo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = parseBackendTimestamp(iso);
  if (!d) return iso;
  return d.toLocaleDateString('ro-RO');
}

export function formatDateTimeRo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = parseBackendTimestamp(iso);
  if (!d) return iso;
  return d.toLocaleString('ro-RO');
}
