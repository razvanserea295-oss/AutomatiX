


























import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { hashPassword } from '../security/password';

const BATCH = 'step6';
const DEMO_USER_USERNAME = 'demo_proiectant';

export interface DemoSeedStatus {
  
  total: number;
  
  per_table: Record<string, number>;
  

  seeded: boolean;
}

export interface SeedResult {
  inserted: number;
  per_table: Record<string, number>;
}

export interface ClearResult {
  deleted: number;
  per_table: Record<string, number>;
}





function ensureAdmin(user: UserWithRole): void {
  if ((user.role_name || '').toLowerCase() !== 'admin') {
    throw CommandError.forbidden('Doar adminul poate gestiona datele demo');
  }
}



function logSeed(db: Database, table: string, rowId: number, note?: string): void {
  try {
    db.run(
      'INSERT OR IGNORE INTO demo_seed_log (batch, table_name, row_id, note) VALUES (?, ?, ?, ?)',
      [BATCH, table, rowId, note ?? null],
    );
  } catch (e) {
    console.warn('[demoSeed] logSeed failed:', e instanceof Error ? e.message : e);
  }
}

function lastInsertId(db: Database): number {
  const stmt = db.prepare('SELECT last_insert_rowid()');
  stmt.step();
  const id = stmt.get()[0] as number;
  stmt.free();
  return id;
}

function adminUserId(db: Database): number {
  const stmt = db.prepare(`
    SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.active = 1 AND LOWER(r.name) = 'admin'
     ORDER BY u.id ASC LIMIT 1`);
  if (!stmt.step()) { stmt.free(); throw CommandError.internal('Nu există admin activ'); }
  const id = stmt.get()[0] as number;
  stmt.free();
  return id;
}

function userRoleId(db: Database): number {
  const stmt = db.prepare(`SELECT id FROM roles WHERE LOWER(name) = 'user' ORDER BY id ASC LIMIT 1`);
  if (!stmt.step()) { stmt.free(); throw CommandError.internal('Rolul user nu este definit'); }
  const id = stmt.get()[0] as number;
  stmt.free();
  return id;
}

function findPieceId(db: Database, projectName: string, pieceName: string): number | null {
  const stmt = db.prepare(`
    SELECT pp.id FROM project_pieces pp
      JOIN projects p ON p.id = pp.project_id
     WHERE p.name = ? AND pp.name = ? LIMIT 1`);
  stmt.bind([projectName, pieceName]);
  if (!stmt.step()) { stmt.free(); return null; }
  const id = stmt.get()[0] as number;
  stmt.free();
  return id;
}





export class DemoSeedService {
  

  static status(db: Database, user: UserWithRole): DemoSeedStatus {
    ensureAdmin(user);
    const stmt = db.prepare(
      'SELECT table_name, COUNT(*) as cnt FROM demo_seed_log WHERE batch = ? GROUP BY table_name',
    );
    stmt.bind([BATCH]);
    const per_table: Record<string, number> = {};
    let total = 0;
    while (stmt.step()) {
      const row = stmt.getAsObject() as { table_name: string; cnt: number };
      per_table[row.table_name] = row.cnt;
      total += row.cnt;
    }
    stmt.free();
    return { total, per_table, seeded: total > 0 };
  }

  













  static async seedStep6Demo(db: Database, user: UserWithRole): Promise<SeedResult> {
    ensureAdmin(user);
    const existing = this.status(db, user);
    if (existing.seeded) {
      throw CommandError.badRequest(
        `Demo deja prezent (${existing.total} rânduri). Rulează clear_demo_step6 înainte.`,
      );
    }

    const perTable: Record<string, number> = {};
    const bump = (table: string) => { perTable[table] = (perTable[table] || 0) + 1; };

    
    
    
    
    
    let demoUserId: number;
    const findUser = db.prepare('SELECT id FROM users WHERE username = ?');
    findUser.bind([DEMO_USER_USERNAME]);
    if (findUser.step()) {
      demoUserId = findUser.get()[0] as number;
      findUser.free();
    } else {
      findUser.free();
      const userRid = userRoleId(db);
      
      
      
      const pwHash = await hashPassword('Demo1234!');
      db.run(
        `INSERT INTO users (username, email, password_hash, full_name, role_id, active, job_title)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [DEMO_USER_USERNAME, 'demo.proiectant@automatix.local', pwHash,
         'Proiectant Demo (DEMO)', userRid, 'Inginer proiectant — DEMO'],
      );
      demoUserId = lastInsertId(db);
      logSeed(db, 'users', demoUserId, 'demo proiectant — username demo_proiectant / pwd Demo1234!');
      bump('users');
    }
    const adminId = adminUserId(db);

    
    
    
    
    const asfaltSchema = {
      header_fields: [
        { key: 'proiect', label: 'Proiect', type: 'text' },
        { key: 'data',    label: 'Data',    type: 'text' },
      ],
      sections: [
        {
          key: 'tracking',
          title: 'Etape (DEMO)',
          type: 'tracking',
          columns: ['PROIECT', 'DXF', 'DESENE', 'EXECUTIE', 'LIVRAT'],
          assemblies: [
            { key: 'asm1', label: 'Buncăr agregate 80t', sub: [
              { key: 'p1', label: 'Compartimente' },
              { key: 'p2', label: 'Bandă alimentare' },
            ]},
            { key: 'asm2', label: 'Uscător rotativ', sub: [
              { key: 'p3', label: 'Tambur' },
              { key: 'p4', label: 'Arzător 4MW' },
            ]},
          ],
        },
        {
          key: 'specs',
          title: 'Specificații tehnice (DEMO)',
          type: 'form',
          fields: [
            { key: 'capacitate',  label: 'Capacitate (t/h)', type: 'text' },
            { key: 'putere_inst', label: 'Putere instalată (kW)', type: 'text' },
            { key: 'observatii',  label: 'Observații', type: 'textarea' },
          ],
        },
      ],
    };
    db.run(
      `INSERT INTO fisa_templates
         (name, description, schema_json, created_by_user_id, is_default, active, sort_order)
       VALUES (?, ?, ?, ?, 0, 1, 50)`,
      ['Stație asfalt 80t/h — DEMO',
       'Template demo pentru stație asfalt mobilă. Poate fi șters din panoul Demo.',
       JSON.stringify(asfaltSchema), adminId],
    );
    const templateId = lastInsertId(db);
    logSeed(db, 'fisa_templates', templateId);
    bump('fisa_templates');

    
    
    
    
    
    
    
    const projStmt = db.prepare(`SELECT id FROM projects WHERE name = ? LIMIT 1`);
    projStmt.bind(['Stație betoane M60 — DEMO']);
    const demoProjectId: number | null = projStmt.step() ? (projStmt.get()[0] as number) : null;
    projStmt.free();

    const briefingDefs: Array<{
      title: string;
      status: 'sent' | 'accepted' | 'clarification_requested';
      from: number;
      to: number;
      priority: string;
      deadline: string;
      scope: string;
      tech: string;
      client: string;
    }> = [
      {
        title: 'Modernizare buncăr 5t — DEMO',
        status: 'sent',
        from: adminId, to: demoUserId,
        priority: 'high',
        deadline: "date('now', '+14 days')",
        scope: 'Înlocuire compartimentare buncăr existent. Capacitate finală 5t. Construit Q3 2024.',
        tech: '- Material: S355\n- Grosime tablă: 6mm\n- Acoperire: vopsea epoxidică 2 straturi',
        client: 'Predare la șantier până pe 30 iunie. Nu trebuie întrerupt fluxul de producție.',
      },
      {
        title: 'Proiectare bandă transportoare 18m — DEMO',
        status: 'accepted',
        from: adminId, to: demoUserId,
        priority: 'medium',
        deadline: "date('now', '+30 days')",
        scope: 'Bandă transportoare agregate sortate, lungime 18m, înclinare 18°, capacitate 80t/h.',
        tech: '- Motor reductor 7.5kW SEW\n- Bandă cauciuc EP400/3\n- Role Ø108',
        client: 'Integrare cu sistemul existent. Schemele electrice vin de la beneficiar.',
      },
      {
        title: 'Re-design malaxor 1m³ — DEMO',
        status: 'clarification_requested',
        from: adminId, to: demoUserId,
        priority: 'critical',
        deadline: "date('now', '+7 days')",
        scope: 'Re-proiectare cuvă malaxor existent. Soluționare uzură prematură brațe.',
        tech: '- Brațe: Hardox 500 (era S355)\n- Lining: Ni-Hard (era oțel)\n- Brațe schimbabile fără demontare cuvă',
        client: 'Versiune îmbunătățită care reduce intervenția de mentenanță de la 3 luni la 12 luni.',
      },
    ];

    const briefingIds: Record<string, number> = {};
    for (const b of briefingDefs) {
      db.run(
        `INSERT INTO project_briefings
           (title, project_id, created_by_user_id, assigned_to_user_id,
            scope, technical_requirements, client_expectations,
            deadline, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ${b.deadline}, ?, ?)`,
        [b.title, demoProjectId, b.from, b.to, b.scope, b.tech, b.client, b.priority, b.status],
      );
      const id = lastInsertId(db);
      briefingIds[b.title] = id;
      logSeed(db, 'project_briefings', id);
      bump('project_briefings');
    }

    
    
    
    
    
    const clarTarget = briefingIds['Re-design malaxor 1m³ — DEMO'];
    if (clarTarget) {
      db.run(
        `INSERT INTO briefing_clarifications
           (briefing_id, asked_by_user_id, question, asked_at,
            answered_by_user_id, answer, answered_at, status)
         VALUES (?, ?, ?, datetime('now', '-2 hours'),
                 ?, ?, datetime('now', '-1 hour'), 'answered')`,
        [clarTarget, demoUserId,
         'Brațele Hardox 500 sunt suficiente sau e nevoie de protecție suplimentară pe muchii?',
         adminId,
         'Hardox 500 e suficient. Adăugăm doar plăcuțe sacrificiale pe muchiile de atac.'],
      );
      const ansId = lastInsertId(db);
      logSeed(db, 'briefing_clarifications', ansId);
      bump('briefing_clarifications');

      db.run(
        `INSERT INTO briefing_clarifications
           (briefing_id, asked_by_user_id, question, asked_at, status)
         VALUES (?, ?, ?, datetime('now', '-15 minutes'), 'pending')`,
        [clarTarget, demoUserId,
         'Care e bugetul aprobat pentru această re-proiectare? Mențin estimarea de 18.000 EUR?'],
      );
      const pendId = lastInsertId(db);
      logSeed(db, 'briefing_clarifications', pendId);
      bump('briefing_clarifications');
    }

    
    
    
    
    
    
    type PieceSpec = {
      pieceName: string;
      supplierCode: string;
      status: 'requested' | 'ordered' | 'arrived' | 'installed';
      notes: string;
      qty?: number;
    };
    const pieces: PieceSpec[] = [
      { pieceName: 'PLC Siemens S7-1200',     supplierCode: 'EL',  status: 'requested', notes: 'CPU 1214C — demo', qty: 1 },
      { pieceName: 'Motor electric 30kW',     supplierCode: 'CMO', status: 'ordered',   notes: 'ABB IE3 — demo',   qty: 1 },
      { pieceName: 'Filtru praf siloz',       supplierCode: 'CMO', status: 'arrived',   notes: 'WAM Silotop — demo', qty: 2 },
      { pieceName: 'Supapă siguranță presiune', supplierCode: 'HID', status: 'installed', notes: 'Demo — ciclu complet', qty: 1 },
    ];
    for (const p of pieces) {
      const pieceId = findPieceId(db, 'Stație betoane M60 — DEMO', p.pieceName);
      if (!pieceId) continue;

      
      const existing = db.prepare('SELECT id FROM piece_order_tracking WHERE piece_id = ?');
      existing.bind([pieceId]);
      const hasRow = existing.step();
      existing.free();
      if (hasRow) continue;

      const orderedAt   = p.status === 'ordered' || p.status === 'arrived' || p.status === 'installed' ? "datetime('now', '-3 days')" : 'NULL';
      const arrivedAt   = p.status === 'arrived' || p.status === 'installed' ? "datetime('now', '-1 day')" : 'NULL';
      const installedAt = p.status === 'installed' ? "datetime('now', '-2 hours')" : 'NULL';
      const orderedBy   = p.status === 'ordered' || p.status === 'arrived' || p.status === 'installed' ? String(adminId) : 'NULL';
      const arrivedBy   = p.status === 'arrived' || p.status === 'installed' ? String(adminId) : 'NULL';
      const installedBy = p.status === 'installed' ? String(adminId) : 'NULL';

      db.run(
        `INSERT INTO piece_order_tracking
           (piece_id, status, supplier_code, quantity, notes,
            requested_by_user_id, requested_at,
            ordered_by_user_id, ordered_at,
            arrived_by_user_id, arrived_at,
            installed_by_user_id, installed_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-5 days'),
                 ${orderedBy}, ${orderedAt},
                 ${arrivedBy}, ${arrivedAt},
                 ${installedBy}, ${installedAt})`,
        [pieceId, p.status, p.supplierCode, p.qty ?? 1, p.notes, adminId],
      );
      const id = lastInsertId(db);
      logSeed(db, 'piece_order_tracking', id, `${p.pieceName} → ${p.status}`);
      bump('piece_order_tracking');
    }

    
    
    
    
    
    
    const notifs: Array<{ to: number; kind: string; title: string; msg: string; link: string }> = [
      {
        to: demoUserId, kind: 'briefing_received',
        title: 'Briefing nou de la Administrator',
        msg: 'Modernizare buncăr 5t — DEMO · termen +14 zile',
        link: 'briefings',
      },
      {
        to: demoUserId, kind: 'piece_order_arrived',
        title: 'Piesă sosită: Filtru praf siloz',
        msg: 'Stație betoane M60 — DEMO · cod CMO · 2 buc',
        link: 'parts-ordering',
      },
      {
        to: adminId, kind: 'briefing_clarification_asked',
        title: 'Proiectant Demo a pus o întrebare',
        msg: 'Re-design malaxor 1m³ — DEMO — "Care e bugetul aprobat..."',
        link: 'briefings',
      },
      {
        to: adminId, kind: 'piece_order_requested',
        title: 'Cerere piesă: PLC Siemens S7-1200',
        msg: 'Stație betoane M60 — DEMO · cod EL',
        link: 'parts-ordering',
      },
    ];
    for (const n of notifs) {
      db.run(
        `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now', '-' || abs(random() % 30) || ' minutes'))`,
        [n.to, n.kind, n.title, n.msg, n.link],
      );
      const id = lastInsertId(db);
      logSeed(db, 'user_notifications', id);
      bump('user_notifications');
    }

    const total = Object.values(perTable).reduce((s, n) => s + n, 0);
    return { inserted: total, per_table: perTable };
  }

  













  static clearStep6Demo(db: Database, user: UserWithRole): ClearResult {
    ensureAdmin(user);

    const deleteOrder: string[] = [
      'user_notifications',
      'briefing_clarifications',
      'project_briefings',
      'piece_order_tracking',
      'fisa_templates',
      'users',
    ];

    const perTable: Record<string, number> = {};
    let total = 0;

    for (const table of deleteOrder) {
      const ids = this.idsForTable(db, table);
      if (ids.length === 0) continue;
      
      
      const placeholders = ids.map(() => '?').join(',');
      try {
        db.run(`DELETE FROM ${table} WHERE id IN (${placeholders})`, ids);
        perTable[table] = ids.length;
        total += ids.length;
      } catch (e) {
        console.warn(`[demoSeed] DELETE from ${table} failed:`, e instanceof Error ? e.message : e);
      }
    }

    
    
    
    db.run('DELETE FROM demo_seed_log WHERE batch = ?', [BATCH]);

    return { deleted: total, per_table: perTable };
  }

  private static idsForTable(db: Database, table: string): number[] {
    const stmt = db.prepare(
      'SELECT row_id FROM demo_seed_log WHERE batch = ? AND table_name = ? ORDER BY id ASC',
    );
    stmt.bind([BATCH, table]);
    const out: number[] = [];
    while (stmt.step()) out.push(stmt.get()[0] as number);
    stmt.free();
    return out;
  }
}
