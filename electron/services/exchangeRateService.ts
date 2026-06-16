












import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';

const BNR_URL = 'https://www.bnr.ro/nbrfxrates.xml';

export class ExchangeRateService {
  
  static async fetchBnrEurRon(): Promise<{ rate: number; date: string | null }> {
    let res: Response;
    try {
      res = await fetch(BNR_URL, { headers: { Accept: 'application/xml,text/xml' } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare rețea';
      throw CommandError.badRequest(`BNR inaccesibil: ${msg}`);
    }
    if (!res.ok) throw CommandError.badRequest(`BNR a răspuns ${res.status} — încercați mai târziu`);

    const xml = await res.text();
    
    
    const m = xml.match(/<Rate\s+currency="EUR"(?:\s+multiplier="(\d+)")?\s*>([\d.]+)<\/Rate>/i);
    if (!m) throw CommandError.badRequest('Cursul EUR nu a fost găsit în feed-ul BNR');
    const mult = m[1] ? Number(m[1]) : 1;
    const rate = Number(m[2]) / (mult || 1);
    
    if (!Number.isFinite(rate) || rate < 3 || rate > 10) {
      throw CommandError.badRequest(`Curs EUR/RON neplauzibil din BNR: ${m[2]}`);
    }
    const dm = xml.match(/<PublishingDate>\s*([\d-]+)\s*<\/PublishingDate>/i);
    return { rate: Math.round(rate * 1e4) / 1e4, date: dm ? dm[1] : null };
  }

  

  static async refreshRate(db: Database, save?: () => void): Promise<{ rate: number; date: string | null; updated_at: string }> {
    const { rate, date } = await this.fetchBnrEurRon();
    db.run(
      `UPDATE company_settings
         SET eur_to_ron_rate = ?, eur_to_ron_rate_updated_at = datetime('now'), eur_to_ron_rate_source = 'bnr'
       WHERE id = 1`,
      [rate],
    );
    
    
    
    try { this.recordHistory(db, rate, date, 'bnr'); } catch (e) { console.warn('[exchangeRate] history log failed:', e); }
    if (save) save();
    const updated_at = new Date().toISOString();
    return { rate, date, updated_at };
  }

  


  static recordHistory(db: Database, rate: number, publishedDate: string | null, source: string = 'bnr'): void {
    db.run(
      `INSERT OR REPLACE INTO bnr_rates (currency, rate, published_date, fetched_at, source)
       VALUES ('EUR', ?, ?, datetime('now'), ?)`,
      [rate, publishedDate, source],
    );
  }

  

  static getHistory(
    db: Database,
    opts?: { currency?: string; limit?: number },
  ): Array<{ id: number; currency: string; rate: number; published_date: string | null; fetched_at: string; source: string }> {
    const currency = (opts?.currency || 'EUR').toUpperCase();
    const limit = Math.min(Math.max(Number(opts?.limit) || 60, 1), 1000);
    const stmt = db.prepare(
      `SELECT id, currency, rate, published_date, fetched_at, source
         FROM bnr_rates
        WHERE currency = ?
        ORDER BY COALESCE(published_date, fetched_at) DESC, fetched_at DESC
        LIMIT ?`,
    );
    stmt.bind([currency, limit]);
    const rows: Array<{ id: number; currency: string; rate: number; published_date: string | null; fetched_at: string; source: string }> = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      rows.push({
        id: r.id as number,
        currency: r.currency as string,
        rate: r.rate as number,
        published_date: (r.published_date as string | null) ?? null,
        fetched_at: r.fetched_at as string,
        source: r.source as string,
      });
    }
    stmt.free();
    return rows;
  }

  
  static isStale(db: Database): boolean {
    const stmt = db.prepare('SELECT eur_to_ron_rate_updated_at FROM company_settings WHERE id = 1');
    let ts: string | null = null;
    if (stmt.step()) ts = (stmt.getAsObject().eur_to_ron_rate_updated_at as string | null) ?? null;
    stmt.free();
    if (!ts) return true;
    const norm = ts.includes('T') ? ts : `${ts.replace(' ', 'T')}Z`;
    const updated = new Date(norm).getTime();
    if (Number.isNaN(updated)) return true;
    return Date.now() - updated > 20 * 60 * 60 * 1000;
  }
}
