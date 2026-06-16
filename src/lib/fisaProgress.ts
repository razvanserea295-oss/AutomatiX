






















export const FISA_COLUMNS = ['proiect', 'dxf', 'desene', 'executie', 'livrat'] as const;
export type FisaColumn = (typeof FISA_COLUMNS)[number];

export type ColumnWeights = Record<FisaColumn, number>;


export function equalWeights(): ColumnWeights {
  const per = 100 / FISA_COLUMNS.length;
  return FISA_COLUMNS.reduce((acc, c) => { acc[c] = per; return acc; }, {} as ColumnWeights);
}







export function parseColumnWeights(raw: unknown): ColumnWeights | null {
  let obj: any = raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    try { obj = JSON.parse(s); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object') return null;
  const out = {} as ColumnWeights;
  let sum = 0;
  for (const c of FISA_COLUMNS) {
    const v = Number(obj[c]);
    const w = Number.isFinite(v) && v > 0 ? v : 0;
    out[c] = w;
    sum += w;
  }
  return sum > 0 ? out : null;
}

export interface FisaProgress {
  
  total: number;
  
  done: number;
  
  pct: number;
}








export function computeFisaProgress(
  tracking: unknown,
  weights: ColumnWeights | string | null | undefined,
): FisaProgress {
  const asms = Array.isArray(tracking) ? tracking : [];
  if (asms.length === 0) return { total: 0, done: 0, pct: 0 };

  const w = (typeof weights === 'object' && weights !== null)
    ? weights
    : parseColumnWeights(weights ?? null) ?? equalWeights();
  const weightSum = FISA_COLUMNS.reduce((s, c) => s + (w[c] || 0), 0) || 1;

  
  
  let total = 0, done = 0;
  const colTotal = {} as Record<FisaColumn, number>;
  const colDone = {} as Record<FisaColumn, number>;
  for (const c of FISA_COLUMNS) { colTotal[c] = 0; colDone[c] = 0; }

  for (const asm of asms) {
    const subs = Array.isArray((asm as any)?.subs) ? (asm as any).subs : [];
    for (const sub of subs) {
      for (const c of FISA_COLUMNS) {
        colTotal[c] += 1;
        total += 1;
        if ((sub as any)?.[c]) { colDone[c] += 1; done += 1; }
      }
    }
  }

  if (total === 0) return { total: 0, done: 0, pct: 0 };

  
  let weighted = 0;
  for (const c of FISA_COLUMNS) {
    if (colTotal[c] === 0) continue;
    weighted += (w[c] || 0) * (colDone[c] / colTotal[c]);
  }
  const pct = Math.round((weighted / weightSum) * 100);

  return { total, done, pct: Math.max(0, Math.min(100, pct)) };
}
