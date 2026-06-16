import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { userHasAny } from '../db/permissions';
import type { UserWithRole } from './authService';

function hasAiAccess(db: Database, user: UserWithRole): boolean {
  return userHasAny(db, user, ['all', 'view_all', 'view_projects', 'view_finances', 'view_own_projects'],
    ['ai']);
}

function qNum(db: Database, sql: string): number {
  const stmt = db.prepare(sql);
  stmt.step();
  const val = stmt.get()[0] as number;
  stmt.free();
  return val || 0;
}

export class AiService {
  static ask(db: Database, user: UserWithRole, question: string): any {
    if (!hasAiAccess(db, user)) throw CommandError.forbidden('Acces refuzat');

    const q = question.toLowerCase();
    const usedSources: string[] = [];

    let answer: string;

    if (q.includes('întârzi') || q.includes('intarzi') || q.includes('delay')) {
      usedSources.push('projects.status');
      const delayed = qNum(db, "SELECT COUNT(*) FROM projects WHERE status = 'delayed'");
      const blocked = qNum(db, "SELECT COUNT(*) FROM projects WHERE status = 'blocked'");
      answer = `În acest moment avem ${delayed} proiecte întârziate și ${blocked} proiecte blocate. Prioritizează proiectele cu deadline apropiat din dashboard.`;
    } else if (q.includes('cost') || q.includes('profit') || q.includes('financ')) {
      usedSources.push('finance.calculated');
      const revenue = qNum(db, "SELECT COALESCE(SUM(amount),0) FROM project_revenues");
      const mCost = qNum(db, "SELECT COALESCE(SUM(quantity * unit_cost * (1 + loss_rate)),0) FROM material_consumptions");
      const profit = revenue - mCost;
      answer = `Venit înregistrat: ${Math.round(revenue)} RON. Cost materiale: ${Math.round(mCost)} RON. Profit operațional estimat: ${Math.round(profit)} RON.`;
    } else if (q.includes('material') || q.includes('stoc')) {
      usedSources.push('materials.stock');
      const critical = qNum(db, "SELECT COUNT(*) FROM materials WHERE stock <= min_stock");
      let top = 'N/A';
      try {
        const stmt = db.prepare("SELECT name FROM materials ORDER BY (stock - min_stock) ASC LIMIT 1");
        if (stmt.step()) top = stmt.get()[0] as string;
        stmt.free();
      } catch {}
      answer = `Avem ${critical} materiale cu stoc critic. Cel mai sensibil material acum: ${top}.`;
    } else if (q.includes('document')) {
      usedSources.push('documents');
      const docs = qNum(db, "SELECT COUNT(*) FROM documents");
      const missing = qNum(db, "SELECT COUNT(*) FROM projects p WHERE NOT EXISTS (SELECT 1 FROM documents d WHERE d.project_id = p.id)");
      answer = `Sunt ${docs} documente în sistem. ${missing} proiecte nu au încă documente asociate.`;
    } else {
      return {
        answer: 'Nu am suficiente date structurate pentru întrebarea asta. Reformulează despre: proiecte întârziate, costuri/profit, stocuri sau documente.',
        confidence: 0.25, used_sources: usedSources, insufficient_data: true,
      };
    }

    return { answer, confidence: 0.78, used_sources: usedSources, insufficient_data: false };
  }

  static searchDocuments(db: Database, user: UserWithRole, query: string): any {
    if (!hasAiAccess(db, user)) throw CommandError.forbidden('Acces refuzat');

    const like = `%${query.trim().toLowerCase()}%`;
    const stmt = db.prepare(
      `SELECT d.id, d.name, p.name as project_name, c.name as category_name,
              (CASE WHEN LOWER(d.name) LIKE ? THEN 0.55 ELSE 0 END +
               CASE WHEN LOWER(c.name) LIKE ? THEN 0.10 ELSE 0 END +
               CASE WHEN LOWER(p.name) LIKE ? THEN 0.10 ELSE 0 END) as score
       FROM documents d
       JOIN projects p ON p.id = d.project_id
       JOIN document_categories c ON c.id = d.category_id
       WHERE LOWER(d.name) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(p.name) LIKE ?
       ORDER BY score DESC, d.uploaded_at DESC LIMIT 12`
    );
    stmt.bind([like, like, like, like, like, like]);

    const hits: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      hits.push({ document_id: row.id, document_name: row.name, project_name: row.project_name, category_name: row.category_name, score: row.score });
    }
    stmt.free();

    const summary = hits.length === 0
      ? 'Nu am găsit documente relevante.'
      : `Am găsit ${hits.length} documente relevante. Categorii: ${[...new Set(hits.slice(0, 4).map(h => h.category_name))].join(', ')}.`;

    return { hits, summary };
  }
}
