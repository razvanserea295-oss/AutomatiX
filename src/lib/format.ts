

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
  currency: string | null | undefined = 'RON',
  maximumFractionDigits?: number,
): string {
  return (currency || 'RON').toUpperCase() === 'EUR'
    ? formatCurrencyEur(value || 0, maximumFractionDigits ?? 2)
    : formatCurrencyRon(value || 0, maximumFractionDigits ?? 0);
}







export function convertMoney(
  value: number,
  from: string | null | undefined,
  to: string | null | undefined,
  eurRate: number,
): number {
  const f = (from || 'RON').toUpperCase();
  const t = (to || 'RON').toUpperCase();
  const v = Number.isFinite(value) ? value : 0;
  if (f === t) return v;
  if (!eurRate || eurRate <= 0) return v;
  if (f === 'EUR' && t === 'RON') return v * eurRate;
  if (f === 'RON' && t === 'EUR') return v / eurRate;
  return v;
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
