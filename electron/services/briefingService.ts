










import type { Database } from 'sql.js';
import type { UserWithRole } from './authService';

interface BriefingRow {
  id: number;
  user_id: number;
  briefing_date: string;
  summary_text: string;
  details_json: string | null;
  action_count: number;
  created_at: string;
}

function monthKey(): string {
  
  
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
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

function qNum(db: Database, sql: string, params: any[]): number {
  const r = queryRow<{ cnt: number }>(db, sql, params);
  return r?.cnt ?? 0;
}

interface BriefingDetails {
  generated_at: string;
  period: { year: number; month: number; label: string };
  user: { id: number; username: string; role: string; full_name: string };
  highlights: Array<{ icon: string; tone: 'red' | 'amber' | 'blue' | 'green' | 'gray'; text: string; count?: number }>;
  sections: BriefingSection[];
}
interface BriefingSection {
  title: string;
  icon: string;
  items: Array<{ label: string; value: string | number; sub?: string; tone?: 'red' | 'amber' | 'blue' | 'green' | 'gray' }>;
}

const MONTH_LABELS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                      'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

function gatherCommonStats(db: Database, user: UserWithRole) {
  const role = user.role_name.toLowerCase();
  return {
    role,
    pending_handoffs: qNum(db,
      `SELECT COUNT(*) as cnt FROM project_handoffs WHERE status = 'pending' AND (to_role = ? OR to_user_id = ?)`,
      [role, user.id]),
    urgent_handoffs: qNum(db,
      `SELECT COUNT(*) as cnt FROM project_handoffs WHERE status = 'pending' AND is_urgent = 1 AND (to_role = ? OR to_user_id = ?)`,
      [role, user.id]),
    overdue_handoffs: qNum(db,
      `SELECT COUNT(*) as cnt FROM project_handoffs WHERE status = 'pending' AND datetime(sla_due_at) < datetime('now') AND (to_role = ? OR to_user_id = ?)`,
      [role, user.id]),
    accepted_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM project_handoffs WHERE status = 'accepted'
         AND date(accepted_at) >= date('now', 'start of month')
         AND (to_role = ? OR to_user_id = ?)`,
      [role, user.id]),
    active_projects: qNum(db,
      `SELECT COUNT(*) as cnt FROM projects WHERE status NOT IN ('finalizat', 'anulat')`, []),
    deadlines_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM projects
       WHERE status NOT IN ('finalizat', 'anulat')
         AND deadline IS NOT NULL
         AND deadline >= date('now', 'start of month')
         AND deadline < date('now', 'start of month', '+1 month')`, []),
    deadlines_next_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM projects
       WHERE status NOT IN ('finalizat', 'anulat')
         AND deadline IS NOT NULL
         AND deadline >= date('now', 'start of month', '+1 month')
         AND deadline < date('now', 'start of month', '+2 month')`, []),
    overdue_projects: qNum(db,
      `SELECT COUNT(*) as cnt FROM projects WHERE status NOT IN ('finalizat', 'anulat')
         AND deadline IS NOT NULL AND deadline < date('now')`, []),
    new_projects_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM projects WHERE date(created_at) >= date('now', 'start of month')`, []),
    completed_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM projects WHERE status = 'finalizat'
         AND date(updated_at) >= date('now', 'start of month')`, []),
    new_comments_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM project_comments WHERE date(created_at) >= date('now', 'start of month')`, []),
    unread_alerts: qNum(db,
      `SELECT COUNT(*) as cnt FROM alerts WHERE acknowledged = 0`, []),
  };
}

function gatherSalesStats(db: Database) {
  
  
  
  
  
  
  const leads_pipeline = qNum(db,
    `SELECT COALESCE(SUM(estimated_value), 0) as cnt FROM sales_leads
     WHERE status != 'convertit'`, []);
  const converted_projects_value = qNum(db, `
    SELECT COALESCE(SUM(p.estimated_value), 0) as cnt
    FROM projects p
    WHERE p.id IN (SELECT converted_project_id FROM sales_leads WHERE converted_project_id IS NOT NULL)
      AND p.status NOT IN ('finalizat', 'anulat')`, []);

  return {
    stale_leads: qNum(db,
      `SELECT COUNT(*) as cnt FROM sales_leads
       WHERE status NOT IN ('convertit', 'inchis')
         AND COALESCE(last_contact_date, created_at) < date('now', '-7 days')`, []),
    followups_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM sales_leads
       WHERE status NOT IN ('convertit', 'inchis')
         AND next_followup_date IS NOT NULL
         AND next_followup_date >= date('now', 'start of month')
         AND next_followup_date < date('now', 'start of month', '+1 month')`, []),
    in_negociere: qNum(db,
      `SELECT COUNT(*) as cnt FROM sales_leads WHERE status = 'in_negocieri'`, []),
    new_leads_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM sales_leads WHERE date(created_at) >= date('now', 'start of month')`, []),
    converted_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM sales_leads
       WHERE status = 'convertit' AND date(updated_at) >= date('now', 'start of month')`, []),
    pipeline_value: leads_pipeline + converted_projects_value,
  };
}

function gatherDesignStats(db: Database) {
  return {
    pending_checklists: qNum(db,
      `SELECT COUNT(*) as cnt FROM designer_checklists WHERE status != 'finalized'`, []),
    finalized_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM designer_checklists WHERE status = 'finalized'
         AND date(updated_at) >= date('now', 'start of month')`, []),
    in_proiectare: qNum(db,
      `SELECT COUNT(*) as cnt FROM projects WHERE status = 'In Proiectare'`, []),
  };
}

function gatherProductionStats(db: Database) {
  
  
  
  
  
  
  
  
  return {
    overdue_pieces: qNum(db,
      `SELECT COUNT(*) as cnt FROM project_pieces pp
       JOIN projects p ON p.id = pp.project_id
       WHERE p.deadline IS NOT NULL AND p.deadline < date('now')
         AND pp.status NOT IN ('testat', 'livrat', 'montat')
         AND p.status NOT IN ('finalizat', 'anulat')`, []),
    in_productie: qNum(db,
      `SELECT COUNT(*) as cnt FROM project_pieces pp
       JOIN projects p ON p.id = pp.project_id
       WHERE pp.status NOT IN ('testat', 'livrat', 'montat')
         AND p.status NOT IN ('finalizat', 'anulat')`, []),
    finalized_this_month: qNum(db,
      `SELECT COUNT(*) as cnt FROM project_pieces pp
       JOIN projects p ON p.id = pp.project_id
       WHERE pp.status IN ('testat', 'livrat', 'montat')
         AND date(pp.updated_at) >= date('now', 'start of month')
         AND p.status NOT IN ('anulat')`, []),
    low_stock_materials: qNum(db,
      `SELECT COUNT(*) as cnt FROM materials WHERE stock < min_stock`, []),
  };
}

function gatherFinanceStats(db: Database) {
  
  
  
  
  
  
  
  return {
    unpaid_invoices: qNum(db,
      `SELECT COUNT(*) as cnt FROM finance_invoices WHERE status IN ('sent', 'partial')`, []),
    overdue_invoices: qNum(db,
      `SELECT COUNT(*) as cnt FROM finance_invoices
       WHERE status IN ('sent', 'partial') AND due_date IS NOT NULL AND due_date < date('now')`, []),
    outstanding_amount: qNum(db,
      `SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as cnt FROM finance_invoices
       WHERE status IN ('sent', 'partial')`, []),
    open_compliance: qNum(db,
      `SELECT COUNT(*) as cnt FROM compliance_tasks WHERE status != 'completed'`, []),
    revenue_this_month: qNum(db,
      `SELECT COALESCE(SUM(pr.amount), 0) as cnt
       FROM project_revenues pr
       JOIN projects p ON p.id = pr.project_id
       WHERE date(pr.date) >= date('now', 'start of month')
         AND p.status NOT IN ('anulat')`, []),
    expenses_this_month: qNum(db,
      `SELECT COALESCE(SUM(pe.amount), 0) as cnt
       FROM project_expenses pe
       JOIN projects p ON p.id = pe.project_id
       WHERE date(pe.date) >= date('now', 'start of month')
         AND p.status NOT IN ('anulat')`, []),
  };
}

function gatherManagerStats(db: Database) {
  return {
    critical_anomalies: qNum(db,
      `SELECT COUNT(*) as cnt FROM ai_anomalies WHERE acknowledged = 0 AND severity IN ('critical', 'high')`, []),
    total_users_active: qNum(db,
      `SELECT COUNT(*) as cnt FROM users WHERE active = 1`, []),
  };
}

function buildDetails(db: Database, user: UserWithRole): { details: BriefingDetails; summary: string; count: number } {
  const common = gatherCommonStats(db, user);
  const role = common.role;
  const sections: BriefingSection[] = [];
  const highlights: BriefingDetails['highlights'] = [];
  let count = 0;

  
  if (common.urgent_handoffs > 0) {
    highlights.push({ icon: 'flame', tone: 'red',
      text: `${common.urgent_handoffs} ${common.urgent_handoffs === 1 ? 'predare urgentă' : 'predări urgente'}`,
      count: common.urgent_handoffs });
    count += common.urgent_handoffs;
  }
  if (common.overdue_handoffs > 0) {
    highlights.push({ icon: 'clock', tone: 'red',
      text: `${common.overdue_handoffs} ${common.overdue_handoffs === 1 ? 'predare blocată >24h' : 'predări blocate >24h'}`,
      count: common.overdue_handoffs });
    count += common.overdue_handoffs;
  }
  if (common.deadlines_this_month > 0) {
    highlights.push({ icon: 'calendar', tone: 'amber',
      text: `${common.deadlines_this_month} ${common.deadlines_this_month === 1 ? 'deadline luna aceasta' : 'deadline-uri luna aceasta'}`,
      count: common.deadlines_this_month });
    count += common.deadlines_this_month;
  }
  if (common.overdue_projects > 0) {
    highlights.push({ icon: 'alert', tone: 'red',
      text: `${common.overdue_projects} ${common.overdue_projects === 1 ? 'proiect cu deadline depășit' : 'proiecte cu deadline depășit'}`,
      count: common.overdue_projects });
    count += common.overdue_projects;
  }
  if (common.unread_alerts > 0) {
    highlights.push({ icon: 'bell', tone: 'amber',
      text: `${common.unread_alerts} ${common.unread_alerts === 1 ? 'alertă necitită' : 'alerte necitite'}`,
      count: common.unread_alerts });
  }

  
  sections.push({
    title: 'Predări',
    icon: 'arrow-right',
    items: [
      { label: 'În așteptare', value: common.pending_handoffs, tone: common.pending_handoffs > 0 ? 'amber' : 'gray' },
      { label: 'Urgente', value: common.urgent_handoffs, tone: common.urgent_handoffs > 0 ? 'red' : 'gray' },
      { label: 'Blocate >24h', value: common.overdue_handoffs, tone: common.overdue_handoffs > 0 ? 'red' : 'gray' },
      { label: 'Acceptate luna aceasta', value: common.accepted_this_month, tone: 'green' },
    ],
  });

  sections.push({
    title: 'Deadline-uri proiecte',
    icon: 'calendar',
    items: [
      { label: 'Luna aceasta', value: common.deadlines_this_month, tone: common.deadlines_this_month > 0 ? 'amber' : 'gray' },
      { label: 'Luna viitoare', value: common.deadlines_next_month, tone: 'blue' },
      { label: 'Depășite', value: common.overdue_projects, tone: common.overdue_projects > 0 ? 'red' : 'gray' },
      { label: 'Proiecte active total', value: common.active_projects, tone: 'gray' },
    ],
  });

  sections.push({
    title: 'Activitate luna aceasta',
    icon: 'pulse',
    items: [
      { label: 'Proiecte noi', value: common.new_projects_this_month, tone: 'blue' },
      { label: 'Proiecte finalizate', value: common.completed_this_month, tone: 'green' },
      { label: 'Comentarii noi', value: common.new_comments_this_month, tone: 'gray' },
      { label: 'Alerte necitite', value: common.unread_alerts, tone: common.unread_alerts > 0 ? 'amber' : 'gray' },
    ],
  });

  
  const monthList = queryRows<{ id: number; name: string; client_name: string | null; deadline: string }>(db,
    `SELECT p.id, p.name, c.name as client_name, p.deadline
     FROM projects p LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.status NOT IN ('finalizat', 'anulat')
       AND p.deadline IS NOT NULL
       AND p.deadline >= date('now', 'start of month')
       AND p.deadline < date('now', 'start of month', '+1 month')
     ORDER BY p.deadline ASC LIMIT 5`, []);
  if (monthList.length > 0) {
    sections.push({
      title: 'Proiecte cu deadline luna aceasta',
      icon: 'flag',
      items: monthList.map(p => ({
        label: p.name,
        value: new Date(p.deadline).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }),
        sub: p.client_name ?? undefined,
        tone: 'amber',
      })),
    });
  }

  
  if (role === 'marketer' || role === 'sales') {
    const s = gatherSalesStats(db);
    count += (s.followups_this_month ?? 0) + (s.stale_leads ?? 0);
    if (s.followups_this_month > 0) {
      highlights.push({ icon: 'phone', tone: 'amber',
        text: `${s.followups_this_month} ${s.followups_this_month === 1 ? 'follow-up luna aceasta' : 'follow-up-uri luna aceasta'}`,
        count: s.followups_this_month });
    }
    sections.push({
      title: 'Pipeline vânzări',
      icon: 'target',
      items: [
        { label: 'Follow-up-uri luna aceasta', value: s.followups_this_month, tone: s.followups_this_month > 0 ? 'amber' : 'gray' },
        { label: 'Lead-uri stagnante (>7z)', value: s.stale_leads, tone: s.stale_leads > 0 ? 'red' : 'gray' },
        { label: 'În negociere', value: s.in_negociere, tone: 'blue' },
        { label: 'Lead-uri noi luna aceasta', value: s.new_leads_this_month, tone: 'green' },
        { label: 'Convertite luna aceasta', value: s.converted_this_month, tone: 'green' },
        { label: 'Valoare pipeline', value: `${(s.pipeline_value / 1000).toFixed(0)}k €`, tone: 'blue' },
      ],
    });
  } else if (role === 'proiectant' || role === 'project_manager') {
    const s = gatherDesignStats(db);
    count += s.pending_checklists ?? 0;
    if (s.pending_checklists > 0) {
      highlights.push({ icon: 'clipboard', tone: 'amber',
        text: `${s.pending_checklists} ${s.pending_checklists === 1 ? 'fișă proiectant nefinalizată' : 'fișe proiectant nefinalizate'}`,
        count: s.pending_checklists });
    }
    sections.push({
      title: 'Proiectare',
      icon: 'pen-tool',
      items: [
        { label: 'Fișe nefinalizate', value: s.pending_checklists, tone: s.pending_checklists > 0 ? 'amber' : 'gray' },
        { label: 'Finalizate luna aceasta', value: s.finalized_this_month, tone: 'green' },
        { label: 'Proiecte în proiectare', value: s.in_proiectare, tone: 'blue' },
      ],
    });
  } else if (role === 'hala' || role === 'hall_foreman') {
    const s = gatherProductionStats(db);
    count += s.overdue_pieces ?? 0;
    if (s.overdue_pieces > 0) {
      highlights.push({ icon: 'package', tone: 'red',
        text: `${s.overdue_pieces} ${s.overdue_pieces === 1 ? 'piesă cu deadline depășit' : 'piese cu deadline depășit'}`,
        count: s.overdue_pieces });
    }
    if (s.low_stock_materials > 0) {
      highlights.push({ icon: 'box', tone: 'amber',
        text: `${s.low_stock_materials} ${s.low_stock_materials === 1 ? 'material sub stoc minim' : 'materiale sub stoc minim'}`,
        count: s.low_stock_materials });
    }
    sections.push({
      title: 'Producție',
      icon: 'factory',
      items: [
        { label: 'Piese cu deadline depășit', value: s.overdue_pieces, tone: s.overdue_pieces > 0 ? 'red' : 'gray' },
        { label: 'În producție', value: s.in_productie, tone: 'blue' },
        { label: 'Finalizate luna aceasta', value: s.finalized_this_month, tone: 'green' },
        { label: 'Materiale sub stoc minim', value: s.low_stock_materials, tone: s.low_stock_materials > 0 ? 'amber' : 'gray' },
      ],
    });
  } else if (role === 'contabil' || role === 'finance') {
    const s = gatherFinanceStats(db);
    count += (s.unpaid_invoices ?? 0) + (s.overdue_invoices ?? 0);
    if (s.overdue_invoices > 0) {
      highlights.push({ icon: 'banknote', tone: 'red',
        text: `${s.overdue_invoices} ${s.overdue_invoices === 1 ? 'factură depășită' : 'facturi depășite'}`,
        count: s.overdue_invoices });
    }
    sections.push({
      title: 'Financiar',
      icon: 'banknote',
      items: [
        { label: 'Facturi neîncasate', value: s.unpaid_invoices, tone: s.unpaid_invoices > 0 ? 'amber' : 'gray' },
        { label: 'Facturi depășite', value: s.overdue_invoices, tone: s.overdue_invoices > 0 ? 'red' : 'gray' },
        { label: 'Sumă restantă', value: `${(s.outstanding_amount / 1000).toFixed(1)}k`, tone: 'blue' },
        { label: 'Compliance deschise', value: s.open_compliance, tone: s.open_compliance > 0 ? 'amber' : 'gray' },
        { label: 'Venituri luna aceasta', value: `${(s.revenue_this_month / 1000).toFixed(1)}k`, tone: 'green' },
        { label: 'Cheltuieli luna aceasta', value: `${(s.expenses_this_month / 1000).toFixed(1)}k`, tone: 'gray' },
      ],
    });
  } else if (role === 'manager' || role === 'admin') {
    const s = gatherManagerStats(db);
    count += s.critical_anomalies ?? 0;
    if (s.critical_anomalies > 0) {
      highlights.push({ icon: 'alert', tone: 'red',
        text: `${s.critical_anomalies} ${s.critical_anomalies === 1 ? 'anomalie critică detectată' : 'anomalii critice detectate'}`,
        count: s.critical_anomalies });
    }
    const sales = gatherSalesStats(db);
    const prod = gatherProductionStats(db);
    const fin = gatherFinanceStats(db);
    sections.push({
      title: 'Vânzări',
      icon: 'target',
      items: [
        { label: 'În negociere', value: sales.in_negociere, tone: 'blue' },
        { label: 'Convertite luna aceasta', value: sales.converted_this_month, tone: 'green' },
        { label: 'Lead-uri noi luna aceasta', value: sales.new_leads_this_month, tone: 'green' },
        { label: 'Lead-uri stagnante', value: sales.stale_leads, tone: sales.stale_leads > 0 ? 'amber' : 'gray' },
        { label: 'Valoare pipeline', value: `${(sales.pipeline_value / 1000).toFixed(0)}k €`, tone: 'blue' },
      ],
    });
    sections.push({
      title: 'Producție',
      icon: 'factory',
      items: [
        { label: 'În producție', value: prod.in_productie, tone: 'blue' },
        { label: 'Cu deadline depășit', value: prod.overdue_pieces, tone: prod.overdue_pieces > 0 ? 'red' : 'gray' },
        { label: 'Finalizate luna aceasta', value: prod.finalized_this_month, tone: 'green' },
        { label: 'Materiale sub stoc minim', value: prod.low_stock_materials, tone: prod.low_stock_materials > 0 ? 'amber' : 'gray' },
      ],
    });
    sections.push({
      title: 'Financiar',
      icon: 'banknote',
      items: [
        { label: 'Facturi depășite', value: fin.overdue_invoices, tone: fin.overdue_invoices > 0 ? 'red' : 'gray' },
        { label: 'Sumă restantă', value: `${(fin.outstanding_amount / 1000).toFixed(1)}k`, tone: 'blue' },
        { label: 'Venituri luna aceasta', value: `${(fin.revenue_this_month / 1000).toFixed(1)}k`, tone: 'green' },
        { label: 'Cheltuieli luna aceasta', value: `${(fin.expenses_this_month / 1000).toFixed(1)}k`, tone: 'gray' },
      ],
    });
    sections.push({
      title: 'Operațional',
      icon: 'pulse',
      items: [
        { label: 'Anomalii critice', value: s.critical_anomalies, tone: s.critical_anomalies > 0 ? 'red' : 'gray' },
        { label: 'Proiecte finalizate luna aceasta', value: common.completed_this_month, tone: 'green' },
        { label: 'Utilizatori activi', value: s.total_users_active, tone: 'gray' },
      ],
    });
  }

  count += common.pending_handoffs;

  const now = new Date();
  const monthName = MONTH_LABELS[now.getMonth()];
  const periodLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${now.getFullYear()}`;

  const details: BriefingDetails = {
    generated_at: now.toISOString(),
    period: { year: now.getFullYear(), month: now.getMonth() + 1, label: periodLabel },
    user: { id: user.id, username: user.username, role: user.role_name, full_name: user.full_name },
    highlights,
    sections,
  };

  
  const lines: string[] = [];
  lines.push(`Bună, ${user.full_name.split(' ')[0]}. Briefing pentru ${periodLabel}.`);
  if (highlights.length === 0) {
    lines.push('Nimic critic luna aceasta. Continuă lucrul în curs.');
  } else {
    lines.push(`Atenție: ${highlights.map(h => h.text).join('; ')}.`);
  }
  if (common.deadlines_this_month > 0) {
    lines.push(`${common.deadlines_this_month} ${common.deadlines_this_month === 1 ? 'proiect ajunge la deadline luna aceasta' : 'proiecte ajung la deadline luna aceasta'}.`);
  }
  if (common.new_projects_this_month > 0) {
    lines.push(`${common.new_projects_this_month} ${common.new_projects_this_month === 1 ? 'proiect nou' : 'proiecte noi'} luna aceasta.`);
  }

  return { details, summary: lines.join(' '), count };
}

export class BriefingService {
  











  static getMyBriefing(db: Database, user: UserWithRole): BriefingRow {
    const period = monthKey();
    const { details, summary, count } = buildDetails(db, user);

    const existing = queryRow<{ id: number }>(db,
      'SELECT id FROM daily_briefings WHERE user_id = ? AND briefing_date = ?',
      [user.id, period]
    );
    if (existing) {
      db.run(
        `UPDATE daily_briefings
            SET summary_text = ?, action_count = ?, details_json = ?, created_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND briefing_date = ?`,
        [summary, count, JSON.stringify(details), user.id, period]
      );
    } else {
      db.run(
        `INSERT INTO daily_briefings (user_id, briefing_date, summary_text, action_count, details_json)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, period, summary, count, JSON.stringify(details)]
      );
    }

    return queryRow<BriefingRow>(db,
      'SELECT * FROM daily_briefings WHERE user_id = ? AND briefing_date = ?',
      [user.id, period]
    )!;
  }

  
  static refreshMyBriefing(db: Database, user: UserWithRole): BriefingRow {
    
    
    
    return this.getMyBriefing(db, user);
  }
}
