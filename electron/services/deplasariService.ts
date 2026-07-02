import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';
import { logAuditEvent } from '../db/auditLogs';





export interface Deplasare {
  id: number; person_name: string; destination: string; reason: string | null;
  project_id: number | null; project_name: string | null;
  departure_date: string; return_date: string | null; status: string;
  notes: string | null; created_by_name: string | null; created_at: string;
  
  
  
  diurna_per_day?: number | null; diurna_total?: number | null;
  transport_cost?: number | null; accommodation_cost?: number | null;
  other_costs?: number | null; food_cost?: number | null;
  advance_paid?: number | null; total_cost?: number | null;
  
  currency?: string | null;
  
  diurna_people?: number | null;
  
  exported_expense_id?: number | null;
  
  
  
  costs_completed_at?: string | null;
  
  additional_persons?: string[] | null;
}

export interface CreateDeplasareRequest {
  person_name: string; destination: string; reason?: string | null;
  project_id?: number | null; departure_date: string;
  return_date?: string | null; notes?: string | null;
  
  additional_persons?: string[] | null;
}

export interface UpdateDeplasareRequest {
  id: number; person_name?: string | null; destination?: string | null;
  reason?: string | null; return_date?: string | null;
  
  departure_date?: string | null; project_id?: number | null;
  status?: string | null; notes?: string | null;
  

  transport_cost?: number | null; accommodation_cost?: number | null;
  other_costs?: number | null;
  

  diurna_per_day?: number | null;
  
  diurna_total?: number | null;
  
  currency?: string | null;
  
  diurna_people?: number | null;
  food_cost?: number | null;
  additional_persons?: string[] | null;
}

export interface DeplasarePayment {
  id: number; deplasare_id: number; amount: number; currency: string;
  paid_at: string; paid_to: string | null; note: string | null;
  
  category: string | null;
  created_by_name: string | null; created_at: string;
}

export interface RecordPaymentRequest {
  deplasare_id: number; amount: number; currency?: string | null;
  paid_at?: string | null; paid_to?: string | null; note?: string | null;
  
  category?: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}






function readEurToRonRate(db: Database): number {
  const stmt = db.prepare('SELECT eur_to_ron_rate FROM company_settings WHERE id = 1');
  let rate = 4.97;
  if (stmt.step()) { const v = stmt.get()[0] as number; if (v && v > 0) rate = v; }
  stmt.free();
  return rate;
}


function convertCurrency(amount: number, from: string, to: string, eurRate: number): number {
  const f = (from || 'RON').toUpperCase(), t = (to || 'RON').toUpperCase();
  if (f === t) return amount;
  if (f === 'EUR' && t === 'RON') return amount * eurRate;
  if (f === 'RON' && t === 'EUR') return eurRate > 0 ? amount / eurRate : amount;
  return amount;
}

const SELECT_SQL = `SELECT d.id, d.person_name, d.destination, d.reason, d.project_id, p.name as project_name,
       d.departure_date, d.return_date, d.status, d.notes, u.full_name as created_by_name, d.created_at,
       d.diurna_per_day, d.diurna_total, d.transport_cost, d.accommodation_cost,
       d.other_costs, d.food_cost, d.advance_paid, d.total_cost, d.currency,
       d.diurna_people, d.exported_expense_id,
       d.additional_persons, d.costs_completed_at
FROM deplasari d LEFT JOIN projects p ON p.id = d.project_id LEFT JOIN users u ON u.id = d.created_by`;

function mapDeplasare(row: any): Deplasare {
  
  let extra: string[] | null = null;
  if (row.additional_persons) {
    try {
      const parsed = JSON.parse(row.additional_persons as string);
      if (Array.isArray(parsed)) extra = parsed.filter(s => typeof s === 'string' && s.trim().length > 0);
    } catch {  }
  }
  return { ...row, additional_persons: extra } as Deplasare;
}






function serializeAdditionalPersons(persons: string[] | null | undefined): string | null {
  if (!Array.isArray(persons)) return null;
  const cleaned = Array.from(
    new Set(persons.map(p => String(p ?? '').trim()).filter(Boolean)),
  );
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}





export class DeplasariService {
  static getAll(db: Database): Deplasare[] {
    return queryRows(db,
      `${SELECT_SQL} ORDER BY CASE d.status
         WHEN 'in_deplasare' THEN 0
         WHEN 'intors' THEN 1
         WHEN 'finalizat' THEN 2
         ELSE 3 END, d.departure_date DESC`,
      [], mapDeplasare,
    );
  }

  








  static create(db: Database, user: UserWithRole, req: CreateDeplasareRequest): Deplasare {
    if (!req.person_name?.trim()) throw CommandError.badRequest('Persoana este obligatorie');
    if (!req.destination?.trim()) throw CommandError.badRequest('Destinatia este obligatorie');
    if (!req.departure_date) throw CommandError.badRequest('Data plecarii este obligatorie');

    const additional = serializeAdditionalPersons(req.additional_persons);

    db.run(
      `INSERT INTO deplasari (
         person_name, destination, reason, project_id,
         departure_date, return_date, notes,
         additional_persons, created_by,
         diurna_per_day, diurna_total, transport_cost,
         accommodation_cost, other_costs, advance_paid, total_cost
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0)`,
      [
        req.person_name.trim(), req.destination.trim(),
        req.reason ?? null, req.project_id ?? null,
        req.departure_date, req.return_date ?? null, req.notes ?? null,
        additional, user.id,
      ],
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    const result = queryOne(db, `${SELECT_SQL} WHERE d.id = ?`, [id], mapDeplasare);
    if (!result) throw CommandError.internal('Eroare la creare deplasare');
    return result;
  }

  










  static update(db: Database, user: UserWithRole, req: UpdateDeplasareRequest): Deplasare {
    
    const current = queryOne(db, `${SELECT_SQL} WHERE d.id = ?`, [req.id], mapDeplasare);
    if (!current) throw CommandError.notFound('Deplasare negasita');

    
    
    
    const isExplicitClose = req.status === 'finalizat' && current.status !== 'finalizat';
    if (isExplicitClose) {
      const role = (user.role_name || '').toLowerCase();
      const allowed = role === 'admin' || role === 'manager' || user.role_id === 1 || user.role_id === 3;
      if (!allowed) throw CommandError.forbidden('Doar Admin sau Manager poate închide delegația');
    }

    
    const newTransport = req.transport_cost != null ? Number(req.transport_cost) : (current.transport_cost ?? 0);
    const newAccommodation = req.accommodation_cost != null ? Number(req.accommodation_cost) : (current.accommodation_cost ?? 0);
    const newOther = req.other_costs != null ? Number(req.other_costs) : (current.other_costs ?? 0);
    const newFood = req.food_cost != null ? Number(req.food_cost) : (current.food_cost ?? 0);
    
    const newDiurna = req.diurna_total != null ? Number(req.diurna_total) : (current.diurna_total ?? 0);
    
    
    const newDiurnaPerDay = req.diurna_per_day != null ? Number(req.diurna_per_day) : (current.diurna_per_day ?? 0);

    
    const newTotal = (newTransport || 0) + (newAccommodation || 0) + (newOther || 0) + (newFood || 0) + (newDiurna || 0);

    
    
    
    
    
    let newStatus = req.status ?? current.status;
    let costsCompletedAt = current.costs_completed_at ?? null;
    const bothFilled = newTransport > 0 && newAccommodation > 0;
    if (req.status == null && bothFilled && newStatus !== 'anulat') {
      newStatus = 'finalizat';
      if (!costsCompletedAt) costsCompletedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    
    
    if (newStatus === 'in_deplasare') costsCompletedAt = null;

    // Revert din 'finalizat' → curăță cheltuielile auto-exportate în Financiar și
    // marker-ul exported_expense_id, ca o re-finalizare (după modificarea
    // costurilor) să re-posteze valorile corecte în loc să lase cele vechi
    // (audit inheritance #3). Nota auto conține „deplasarea #<id> ·" (spațiul +
    // punctul median delimitează id-ul, deci #5 nu prinde #50).
    const revertedFromFinal = current.status === 'finalizat' && newStatus !== 'finalizat';
    if (revertedFromFinal && current.exported_expense_id != null) {
      try { db.run('DELETE FROM project_expenses WHERE notes LIKE ?', [`%deplasarea #${req.id} ·%`]); }
      catch (e) { console.error('[deplasari] cleanup auto-expenses on revert failed:', e); }
    }

    
    const additionalSerialized = req.additional_persons !== undefined
      ? serializeAdditionalPersons(req.additional_persons)
      : undefined;

    db.run(
      `UPDATE deplasari SET
         person_name        = COALESCE(?, person_name),
         destination        = COALESCE(?, destination),
         reason             = COALESCE(?, reason),
         departure_date     = COALESCE(?, departure_date),
         project_id         = COALESCE(?, project_id),
         return_date        = COALESCE(?, return_date),
         status             = ?,
         notes              = COALESCE(?, notes),
         transport_cost     = ?,
         accommodation_cost = ?,
         other_costs        = ?,
         food_cost          = ?,
         diurna_per_day     = ?,
         diurna_total       = ?,
         total_cost         = ?,
         currency           = COALESCE(?, currency),
         diurna_people      = COALESCE(?, diurna_people),
         costs_completed_at = ?,
         additional_persons = COALESCE(?, additional_persons),
         updated_at         = datetime('now')
       WHERE id = ?`,
      [
        req.person_name ?? null, req.destination ?? null,
        req.reason ?? null, req.departure_date ?? null, req.project_id ?? null, req.return_date ?? null,
        newStatus,
        req.notes ?? null,
        newTransport, newAccommodation, newOther, newFood, newDiurnaPerDay, newDiurna, newTotal,
        req.currency ?? null,
        req.diurna_people ?? null,
        costsCompletedAt,
        additionalSerialized ?? null,
        req.id,
      ],
    );

    if (revertedFromFinal) {
      db.run('UPDATE deplasari SET exported_expense_id = NULL WHERE id = ?', [req.id]);
    }

    
    
    
    
    
    
    // global Financiar views, which filter by date rather than project).
    if (newStatus === 'finalizat' && current.exported_expense_id == null && newTotal > 0) {
      try {
        const owner = queryOne(db, 'SELECT created_by FROM deplasari WHERE id = ?', [req.id], r => r.created_by as number);
        const cur = (req.currency ?? current.currency) || 'RON';
        const today = new Date().toISOString().slice(0, 10);
        const beneficiary = current.person_name;
        const period = current.return_date
          ? `${current.departure_date} → ${current.return_date}`
          : `${current.departure_date}`;
        const people = current.diurna_people ?? 1;
        
        const base = (newTransport || 0) + (newAccommodation || 0) + (newOther || 0) + (newFood || 0);
        
        
        const eurRateX = readEurToRonRate(db);
        const paidTotal = queryRows(db,
          'SELECT amount, currency FROM deplasari_payments WHERE deplasare_id = ?', [req.id],
          r => ({ amount: (r.amount as number) || 0, currency: (r.currency as string) || 'RON' }),
        ).reduce((s, p) => s + convertCurrency(p.amount, p.currency, cur, eurRateX), 0);
        const paidNote = paidTotal > 0 ? ` · plăți avansate: ${Math.round(paidTotal * 100) / 100} ${cur}` : '';

        const insertExpense = (category: string, description: string, amount: number, note: string): number | null => {
          db.run(
            `INSERT INTO project_expenses (project_id, category, description, amount, currency, date, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [current.project_id, category, description, amount, cur, today, note, owner],
          );
          return queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number);
        };

        
        
        
        
        
        
        
        let firstId: number | null = null;
        if (base > 0) {
          const id = insertExpense(
            'deplasari',
            `Deplasare: ${beneficiary} → ${current.destination}`,
            base,
            `Auto din deplasarea #${req.id} · ${period} · ${beneficiary}${paidNote}`,
          );
          firstId = firstId ?? id;
        }
        if ((newDiurna || 0) > 0) {
          const id = insertExpense(
            'diurna',
            `Diurnă: ${beneficiary} → ${current.destination} (${people} pers.)`,
            newDiurna,
            `Auto din deplasarea #${req.id} · ${period} · diurnă ${people} pers.`,
          );
          firstId = firstId ?? id;
        }
        if (firstId) db.run('UPDATE deplasari SET exported_expense_id = ? WHERE id = ?', [firstId, req.id]);
      } catch (e) {
        console.error('[deplasari] auto-export to project_expenses failed:', e);
      }
    }

    if (newStatus === 'finalizat' && current.status !== 'finalizat') {
      try {
        logAuditEvent(db, user.id, 'update', 'deplasare', req.id,
          `Delegație închisă: ${current.person_name} → ${current.destination} · total ${newTotal} ${(req.currency ?? current.currency) || 'RON'}`);
      } catch {  }
    }

    const result = queryOne(db, `${SELECT_SQL} WHERE d.id = ?`, [req.id], mapDeplasare);
    if (!result) throw CommandError.notFound('Deplasare negasita dupa update');
    return result;
  }

  






  static backfillUnpostedExpenses(db: Database): { posted: number; lines: number } {
    const trips = queryRows(
      db,
      `SELECT id, project_id, person_name, destination, departure_date, return_date,
              transport_cost, accommodation_cost, other_costs, food_cost, diurna_total, total_cost,
              currency, diurna_people, created_by
         FROM deplasari
        WHERE status = 'finalizat' AND exported_expense_id IS NULL
          AND COALESCE(total_cost, 0) > 0`,
      [],
      (r) => r as Record<string, unknown>,
    );
    if (!trips.length) return { posted: 0, lines: 0 };

    const eurRate = readEurToRonRate(db);
    let posted = 0;
    let lines = 0;

    for (const t of trips) {
      try {
        const id = t.id as number;
        const cur = (t.currency as string) || 'RON';
        const today = new Date().toISOString().slice(0, 10);
        const beneficiary = t.person_name as string;
        const period = t.return_date ? `${t.departure_date} → ${t.return_date}` : `${t.departure_date}`;
        const people = (t.diurna_people as number) ?? 1;
        const transport = Number(t.transport_cost) || 0;
        const accommodation = Number(t.accommodation_cost) || 0;
        const other = Number(t.other_costs) || 0;
        const food = Number(t.food_cost) || 0;
        const diurna = Number(t.diurna_total) || 0;
        const base = transport + accommodation + other + food;

        const paidTotal = queryRows(
          db,
          'SELECT amount, currency FROM deplasari_payments WHERE deplasare_id = ?',
          [id],
          (r) => ({ amount: (r.amount as number) || 0, currency: (r.currency as string) || 'RON' }),
        ).reduce((s, p) => s + convertCurrency(p.amount, p.currency, cur, eurRate), 0);
        const paidNote = paidTotal > 0 ? ` · plăți avansate: ${Math.round(paidTotal * 100) / 100} ${cur}` : '';

        const insertExpense = (category: string, description: string, amount: number, note: string): number | null => {
          db.run(
            `INSERT INTO project_expenses (project_id, category, description, amount, currency, date, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [(t.project_id as number | null) ?? null, category, description, amount, cur, today, note, (t.created_by as number | null) ?? null],
          );
          return queryOne(db, 'SELECT last_insert_rowid() as id', [], (r) => r.id as number);
        };

        let firstId: number | null = null;
        if (base > 0) {
          const eid = insertExpense('deplasari', `Deplasare: ${beneficiary} → ${t.destination}`, base,
            `Backfill din deplasarea #${id} · ${period} · ${beneficiary}${paidNote}`);
          firstId = firstId ?? eid;
          lines++;
        }
        if (diurna > 0) {
          const eid = insertExpense('diurna', `Diurnă: ${beneficiary} → ${t.destination} (${people} pers.)`, diurna,
            `Backfill din deplasarea #${id} · ${period} · diurnă ${people} pers.`);
          firstId = firstId ?? eid;
          lines++;
        }
        if (firstId) {
          db.run('UPDATE deplasari SET exported_expense_id = ? WHERE id = ?', [firstId, id]);
          posted++;
        }
      } catch (e) {
        console.error('[deplasari] backfill failed for trip', t.id, e);
      }
    }
    return { posted, lines };
  }

  static delete(db: Database, user: UserWithRole, id: number): void {
    db.run('DELETE FROM deplasari WHERE id = ?', [id]);
    // Hard delete of a travel/expense record leaves no domain trace — audit it.
    logAuditEvent(db, user.id, 'delete', 'deplasare', id, null);
  }

  
  




  static listPayments(db: Database, deplasareId: number): {
    payments: DeplasarePayment[]; total_paid: number; total_cost: number;
    remaining: number; currency: string; eur_rate: number;
  } {
    const payments = queryRows(db,
      `SELECT p.id, p.deplasare_id, p.amount, p.currency, p.paid_at, p.paid_to, p.note, p.category,
              u.full_name AS created_by_name, p.created_at
       FROM deplasari_payments p LEFT JOIN users u ON u.id = p.created_by
       WHERE p.deplasare_id = ? ORDER BY p.paid_at DESC, p.id DESC`,
      [deplasareId],
      (r): DeplasarePayment => ({
        id: r.id as number,
        deplasare_id: r.deplasare_id as number,
        amount: (r.amount as number) || 0,
        currency: (r.currency as string) || 'RON',
        paid_at: r.paid_at as string,
        paid_to: (r.paid_to as string | null) ?? null,
        note: (r.note as string | null) ?? null,
        category: (r.category as string | null) ?? null,
        created_by_name: (r.created_by_name as string | null) ?? null,
        created_at: r.created_at as string,
      }),
    );
    const trip = queryOne(db, 'SELECT total_cost, currency FROM deplasari WHERE id = ?', [deplasareId],
      r => ({ total_cost: (r.total_cost as number) || 0, currency: ((r.currency as string) || 'RON').toUpperCase() }));
    const tripCurrency = trip?.currency || 'RON';
    const eurRate = readEurToRonRate(db);
    const total_paid = payments.reduce(
      (s, p) => s + convertCurrency(p.amount || 0, p.currency, tripCurrency, eurRate), 0);
    const total_cost = trip?.total_cost ?? 0;
    return { payments, total_paid, total_cost, remaining: total_cost - total_paid, currency: tripCurrency, eur_rate: eurRate };
  }

  static recordPayment(db: Database, user: UserWithRole, req: RecordPaymentRequest): DeplasarePayment {
    if (!req.deplasare_id) throw CommandError.badRequest('Deplasare lipsă');
    const amount = Number(req.amount) || 0;
    if (amount <= 0) throw CommandError.badRequest('Suma plății trebuie să fie > 0');
    const paidAt = req.paid_at || new Date().toISOString().slice(0, 10);
    db.run(
      `INSERT INTO deplasari_payments (deplasare_id, amount, currency, paid_at, paid_to, note, category, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.deplasare_id, amount, (req.currency || 'RON'), paidAt, req.paid_to ?? null, req.note ?? null, req.category ?? null, user.id],
    );
    const id = queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number)!;
    const row = queryOne(db,
      `SELECT p.id, p.deplasare_id, p.amount, p.currency, p.paid_at, p.paid_to, p.note, p.category,
              u.full_name AS created_by_name, p.created_at
       FROM deplasari_payments p LEFT JOIN users u ON u.id = p.created_by WHERE p.id = ?`,
      [id],
      (r): DeplasarePayment => ({
        id: r.id as number, deplasare_id: r.deplasare_id as number, amount: (r.amount as number) || 0,
        currency: (r.currency as string) || 'RON', paid_at: r.paid_at as string,
        paid_to: (r.paid_to as string | null) ?? null, note: (r.note as string | null) ?? null,
        category: (r.category as string | null) ?? null,
        created_by_name: (r.created_by_name as string | null) ?? null, created_at: r.created_at as string,
      }),
    );
    if (!row) throw CommandError.internal('Eroare la înregistrarea plății');
    try {
      logAuditEvent(db, user.id, 'create', 'deplasare_payment', row.id,
        `Plată ${row.amount} ${row.currency} pt. deplasarea #${req.deplasare_id}${row.paid_to ? ` către ${row.paid_to}` : ''}`);
    } catch {  }
    return row;
  }

  static deletePayment(db: Database, user: UserWithRole, id: number): void {
    const row = queryOne(db,
      'SELECT deplasare_id, amount, currency, paid_to FROM deplasari_payments WHERE id = ?', [id],
      r => ({ deplasare_id: r.deplasare_id as number, amount: r.amount as number, currency: r.currency as string, paid_to: (r.paid_to as string | null) ?? null }));
    db.run('DELETE FROM deplasari_payments WHERE id = ?', [id]);
    if (row) {
      try {
        logAuditEvent(db, user.id, 'delete', 'deplasare_payment', id,
          `Plată ștearsă: ${row.amount} ${row.currency} (deplasarea #${row.deplasare_id}${row.paid_to ? `, către ${row.paid_to}` : ''})`);
      } catch {  }
    }
  }

  




  /**
   * Auto-close the travel window: any trip still flagged `in_deplasare` whose
   * `return_date` has already passed is moved to `intors` (returned). Mirrors the
   * manual "marchează întors" action so a forgotten trip doesn't linger as active.
   *
   * `date(return_date) < date('now')` is deliberately *strictly* in the past — a
   * trip due back today is only flipped the following day, so we never mark
   * someone returned while they may still be travelling on the return date.
   *
   * Returns the ids that were flipped (empty when nothing changed) so the caller
   * can decide whether to persist. Once a trip is `intors`, the existing
   * cost-completion reminder (findOverdueCostCompletion) takes over.
   */
  static autoMarkReturned(db: Database): number[] {
    const stmt = db.prepare(
      `SELECT id FROM deplasari
        WHERE status = 'in_deplasare'
          AND return_date IS NOT NULL AND TRIM(return_date) <> ''
          AND date(return_date) < date('now')`,
    );
    const ids: number[] = [];
    while (stmt.step()) ids.push(stmt.get()[0] as number);
    stmt.free();
    if (ids.length === 0) return [];

    db.run(
      `UPDATE deplasari
          SET status = 'intors', updated_at = datetime('now')
        WHERE status = 'in_deplasare'
          AND return_date IS NOT NULL AND TRIM(return_date) <> ''
          AND date(return_date) < date('now')`,
    );
    return ids;
  }

  static findOverdueCostCompletion(db: Database): Array<{
    id: number; person_name: string; destination: string;
    return_date: string; days_overdue: number;
  }> {
    const stmt = db.prepare(
      `SELECT id, person_name, destination, return_date,
              CAST(julianday('now') - julianday(return_date) AS INTEGER) AS days_since_return
       FROM deplasari
       WHERE status = 'intors'
         AND return_date IS NOT NULL
         AND julianday('now') - julianday(return_date) > 7
         AND (transport_cost IS NULL OR transport_cost <= 0
              OR accommodation_cost IS NULL OR accommodation_cost <= 0)`,
    );
    const out: Array<{ id: number; person_name: string; destination: string; return_date: string; days_overdue: number }> = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      out.push({
        id: r.id as number,
        person_name: r.person_name as string,
        destination: r.destination as string,
        return_date: r.return_date as string,
        days_overdue: (r.days_since_return as number) - 7,
      });
    }
    stmt.free();
    return out;
  }
}
