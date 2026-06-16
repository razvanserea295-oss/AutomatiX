











import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { HandoffService } from './handoffService';





interface AiServiceConfig {
  url: string;
  token: string;
}

function getAiConfig(): AiServiceConfig {
  
  
  
  return {
    url: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8100',
    token: process.env.AI_SERVICE_TOKEN || '',
  };
}

interface AiChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

async function aiChat(messages: AiChatMessage[], timeoutMs = 60000): Promise<string> {
  const cfg = getAiConfig();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
  const res = await fetch(`${cfg.url}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, session_id: `handoff-${Date.now()}` }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`AI service error ${res.status}: ${text}`);
  }
  const data = await res.json() as { reply?: string };
  return data.reply ?? '';
}





function queryRow<T>(db: Database, sql: string, params: any[]): T | null {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let row: T | null = null;
  if (stmt.step()) row = stmt.getAsObject() as T;
  stmt.free();
  return row;
}

function queryRows<T>(db: Database, sql: string, params: any[]): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const out: T[] = [];
  while (stmt.step()) out.push(stmt.getAsObject() as T);
  stmt.free();
  return out;
}

interface ProjectContext {
  project: any;
  client: any | null;
  pieces_count: number;
  recent_comments: { author: string; content: string; created_at: string }[];
  recent_activity: { action_type: string; description: string | null; created_at: string }[];
  contract: any | null;
  checklist: any | null;
}

function gatherProjectContext(db: Database, projectId: number): ProjectContext {
  const project = queryRow<any>(db,
    'SELECT id, name, description, status, stage_id, priority, deadline, estimated_value, estimated_cost FROM projects WHERE id = ?',
    [projectId]
  );
  if (!project) throw CommandError.notFound('Proiect inexistent');

  const client = project.client_id
    ? queryRow<any>(db, 'SELECT id, name, contact_person, email FROM clients WHERE id = ?', [project.client_id])
    : null;

  const pieces_count = (queryRow<{ cnt: number }>(db,
    'SELECT COUNT(*) as cnt FROM project_pieces WHERE project_id = ?', [projectId]
  )?.cnt) || 0;

  const recent_comments = queryRows<any>(db,
    `SELECT u.full_name as author, c.content, c.created_at
     FROM project_comments c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.project_id = ? ORDER BY c.created_at DESC LIMIT 5`,
    [projectId]
  );

  const recent_activity = queryRows<any>(db,
    `SELECT action AS action_type, details AS description, created_at
     FROM project_activity WHERE project_id = ? ORDER BY created_at DESC LIMIT 8`,
    [projectId]
  );

  const contract = queryRow<any>(db,
    `SELECT contract_code, title, sale_price, execution_term, pif_term, observations
     FROM contracts WHERE project_id = ? LIMIT 1`,
    [projectId]
  );

  const checklist = queryRow<any>(db,
    `SELECT status, revision, updated_at FROM designer_checklists WHERE project_id = ? LIMIT 1`,
    [projectId]
  );

  return { project, client, pieces_count, recent_comments, recent_activity, contract, checklist };
}





const ROLE_NICE: Record<string, string> = {
  marketer: 'Vânzări',
  sales: 'Vânzări',
  proiectant: 'Proiectant',
  project_manager: 'Proiectant',
  hala: 'Șef Hală',
  hall_foreman: 'Șef Hală',
  manager: 'Manager',
  contabil: 'Contabilitate',
  finance: 'Contabilitate',
};

export class AiHandoffService {
  



  static async generateHandoffSummary(
    db: Database,
    user: UserWithRole,
    handoffId: number
  ): Promise<{ summary: string }> {
    const handoff = HandoffService.getById(db, handoffId);
    const ctx = gatherProjectContext(db, handoff.project_id);
    const toRoleNice = ROLE_NICE[handoff.to_role] ?? handoff.to_role;

    const systemMsg =
      `Ești un asistent care scrie rezumate scurte pentru predarea proiectelor între roluri. ` +
      `Generezi 2-3 propoziții în română, clare și utile pentru ${toRoleNice}. ` +
      `Subliniezi ce e important: deadline, restricții speciale, riscuri. ` +
      `Nu repeți informații evidente. Stilul: profesionist, direct, fără fraze de umplutură.`;

    const userMsg = [
      `Predare proiect către ${toRoleNice}.`,
      `Proiect: ${ctx.project.name}`,
      ctx.client ? `Client: ${ctx.client.name}` : '',
      `De la stage "${handoff.from_stage_name}" la "${handoff.to_stage_name}".`,
      ctx.project.deadline ? `Deadline: ${ctx.project.deadline}` : '',
      ctx.project.estimated_value ? `Valoare estimată: ${ctx.project.estimated_value} EUR` : '',
      ctx.contract?.observations ? `Observații contract: ${ctx.contract.observations}` : '',
      `Număr piese: ${ctx.pieces_count}`,
      ctx.recent_comments.length > 0
        ? `Comentarii recente: ${ctx.recent_comments.slice(0, 3).map(c => `[${c.author}] ${c.content}`).join(' | ')}`
        : '',
      handoff.handoff_notes ? `Note utilizator: ${handoff.handoff_notes}` : '',
      `Generează rezumatul de predare:`,
    ].filter(Boolean).join('\n');

    let summary: string;
    try {
      summary = await aiChat([
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg },
      ]);
    } catch (err) {
      
      summary = `${ctx.project.name} (${ctx.client?.name ?? '—'}) — predare ${handoff.from_stage_name} → ${handoff.to_stage_name}. ${pieces_count_phrase(ctx.pieces_count)}${ctx.project.deadline ? ` Deadline: ${ctx.project.deadline}.` : ''}`;
    }

    HandoffService.updateAiSummary(db, handoffId, summary.trim());
    return { summary: summary.trim() };
  }

  




  static detectAnomalies(db: Database, _user: UserWithRole): { generated: number; types: Record<string, number> } {
    const types: Record<string, number> = {};
    const insert = (
      type: string,
      entity_type: string,
      entity_id: number,
      severity: string,
      title: string,
      description: string,
      suggestion: string | null,
    ) => {
      
      const exists = queryRow<{ cnt: number }>(db,
        'SELECT COUNT(*) as cnt FROM ai_anomalies WHERE type = ? AND entity_type = ? AND entity_id = ? AND acknowledged = 0',
        [type, entity_type, entity_id]
      )?.cnt || 0;
      if (exists > 0) return;
      db.run(
        `INSERT INTO ai_anomalies (type, entity_type, entity_id, severity, title, description, suggestion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [type, entity_type, entity_id, severity, title, description, suggestion]
      );
      types[type] = (types[type] || 0) + 1;
    };

    
    
    const overdueHandoffs = queryRows<any>(db,
      `SELECT h.id, p.name as project_name, h.to_role, h.created_at
       FROM project_handoffs h JOIN projects p ON p.id = h.project_id
       WHERE h.status = 'pending' AND datetime(h.sla_due_at) < datetime('now')`,
      []
    );
    for (const h of overdueHandoffs) {
      insert(
        'stale_handoff', 'handoff', h.id, 'high',
        `Predare blocată >24h: ${h.project_name}`,
        `Predarea către ${h.to_role} stă pendinte de peste 24 de ore.`,
        'Contactează rolul destinatar sau forțează tranziția.'
      );
    }

    
    const lowMarginProjects = queryRows<any>(db,
      `SELECT p.id, p.name, p.estimated_value,
              COALESCE((SELECT SUM(quantity * unit_cost * (1 + loss_rate)) FROM material_consumptions WHERE project_id = p.id), 0) +
              COALESCE((SELECT SUM(parts_cost) FROM piece_services WHERE project_id = p.id AND status = 'finalizat'), 0) +
              COALESCE((SELECT SUM(labor_cost) FROM piece_services WHERE project_id = p.id AND status = 'finalizat'), 0) +
              COALESCE((SELECT SUM(amount) FROM project_expenses WHERE project_id = p.id), 0) as total_cost
       FROM projects p
       WHERE p.estimated_value > 0 AND p.status NOT IN ('finalizat', 'anulat')`,
      []
    );
    for (const p of lowMarginProjects) {
      const margin = p.estimated_value > 0 ? ((p.estimated_value - p.total_cost) / p.estimated_value) * 100 : 0;
      if (margin < 5) {
        insert(
          'low_margin', 'project', p.id, margin < 0 ? 'critical' : 'high',
          `Margă slabă: ${p.name} (${margin.toFixed(1)}%)`,
          `Proiectul are o margă de doar ${margin.toFixed(1)}%. Costuri actuale: ${Math.round(p.total_cost)} RON, valoare estimată: ${Math.round(p.estimated_value)} RON.`,
          margin < 0 ? 'Investighează costurile sau renegociază contractul.' : 'Verifică cheltuielile suplimentare.'
        );
      }
    }

    
    
    const mismatched = queryRows<any>(db,
      `SELECT id, name, stage_id, status FROM projects
       WHERE status NOT IN ('blocat', 'anulat', 'blocked')
         AND stage_id IS NOT NULL
         AND ((stage_id = 1 AND status != 'ofertă' AND status != 'oferta')
           OR (stage_id = 2 AND status != 'aprobat')
           OR (stage_id = 8 AND status != 'livrare')
           OR (stage_id = 9 AND status != 'finalizat')
           OR (stage_id BETWEEN 3 AND 7 AND status != 'în producție')
           OR (stage_id BETWEEN 10 AND 19 AND status != 'în producție'))`,
      []
    );
    for (const m of mismatched) {
      insert(
        'stage_mismatch', 'project', m.id, 'medium',
        `Stage/status inconsistent: ${m.name}`,
        `Stage ${m.stage_id} dar status "${m.status}" — drift detectat.`,
        'Re-rulează migrația 045 sau actualizează manual.'
      );
    }

    
    const staleLeads = queryRows<any>(db,
      `SELECT id, client_name, last_contact_date, estimated_value
       FROM sales_leads
       WHERE status NOT IN ('convertit', 'inchis')
         AND (last_contact_date IS NULL OR last_contact_date < date('now', '-14 days'))
         AND estimated_value > 0`,
      []
    );
    for (const l of staleLeads) {
      insert(
        'stale_lead', 'lead', l.id, 'medium',
        `Lead fără contact: ${l.client_name}`,
        `Niciun contact înregistrat de >14 zile. Valoare estimată: ${Math.round(l.estimated_value)} EUR.`,
        'Contactează clientul sau marchează lead-ul ca închis.'
      );
    }

    
    const criticalStock = queryRows<any>(db,
      `SELECT id, name, code, stock, min_stock FROM materials
       WHERE stock <= min_stock AND min_stock > 0`,
      []
    );
    for (const m of criticalStock) {
      insert(
        'critical_stock_no_po', 'material', m.id, 'high',
        `Stoc critic: ${m.name}`,
        `Stoc actual: ${m.stock}, minim: ${m.min_stock}.`,
        'Lansează comandă de aprovizionare.'
      );
    }

    const generated = Object.values(types).reduce((s, n) => s + n, 0);
    return { generated, types };
  }

  static getAnomalies(db: Database, _user: UserWithRole, includeAcknowledged = false): any[] {
    const sql = includeAcknowledged
      ? `SELECT * FROM ai_anomalies ORDER BY
           CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           created_at DESC LIMIT 50`
      : `SELECT * FROM ai_anomalies WHERE acknowledged = 0 ORDER BY
           CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           created_at DESC LIMIT 50`;
    return queryRows<any>(db, sql, []);
  }

  static acknowledgeAnomaly(db: Database, user: UserWithRole, id: number): void {
    db.run(
      "UPDATE ai_anomalies SET acknowledged = 1, acknowledged_by_user_id = ?, acknowledged_at = datetime('now') WHERE id = ?",
      [user.id, id]
    );
  }
}

function pieces_count_phrase(n: number): string {
  if (n === 0) return 'Niciun reper definit încă.';
  if (n === 1) return '1 reper în proiect.';
  return `${n} repere în proiect.`;
}
