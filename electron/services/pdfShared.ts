









import type { Database } from 'sql.js';
import { queryOne } from '../db/sqlHelpers';

export interface Branding {
  logo_base64: string;
  seal_base64: string;
  phone: string;
  email: string;
}


export function getBranding(db: Database): Branding {
  const row = queryOne(
    db,
    'SELECT logo_base64, seal_base64, phone, email FROM company_settings WHERE id = 1',
    [],
    r => r as Record<string, unknown>,
  ) ?? {};
  return {
    logo_base64: (row.logo_base64 as string) || '',
    seal_base64: (row.seal_base64 as string) || '',
    phone: (row.phone as string) || '',
    email: (row.email as string) || '',
  };
}


export function logoNode(logoBase64: string, width = 96): any | null {
  if (!logoBase64) return null;
  
  const src = logoBase64.startsWith('data:') ? logoBase64 : `data:image/png;base64,${logoBase64}`;
  return { image: src, width, fit: [width, 56] };
}






export function getEurRateForDate(db: Database, isoDate: string | null | undefined): number {
  const day = (isoDate || '').split('T')[0] || '';
  if (day) {
    const r = queryOne(
      db,
      `SELECT rate FROM bnr_rates
       WHERE currency = 'EUR' AND published_date IS NOT NULL AND published_date <= ?
       ORDER BY published_date DESC LIMIT 1`,
      [day],
      row => row.rate as number,
    );
    if (r && Number.isFinite(r) && r > 0) return r;
  }
  const live = queryOne(
    db,
    'SELECT eur_to_ron_rate FROM company_settings WHERE id = 1',
    [],
    row => row.eur_to_ron_rate as number,
  );
  if (live && Number.isFinite(live) && live > 0) return live;
  return 4.97;
}





export function dualCurrencyLine(total: number, currency: string, eurRate: number): string {
  const cur = (currency || 'RON').toUpperCase();
  if (eurRate <= 0) return '';
  if (cur === 'EUR') {
    const ron = total * eurRate;
    return `≈ ${ron.toFixed(2)} RON (curs BNR ${eurRate.toFixed(4)})`;
  }
  
  const eur = total / eurRate;
  return `≈ ${eur.toFixed(2)} EUR (curs BNR ${eurRate.toFixed(4)})`;
}
