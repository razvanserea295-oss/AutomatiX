import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';
import { ProjectService } from './projectService';





export interface ContractSectionTemplate {
  id: number; name: string; default_content: string; order_index: number; required: boolean;
}

export interface ContractSection {
  id: number; contract_id: number; template_id: number | null;
  title: string; content: string; order_index: number; required: boolean;
}

export interface Contract {
  id: number; project_id: number; project_name: string; contract_code: string;
  title: string; client_id: number; client_name: string;
  site_location: string | null; delivered_product: string | null;
  sale_price: number; execution_term: string | null; pif_term: string | null;
  status: string; revision: number; observations: string | null;
  created_by_name: string | null; created_at: string; updated_at: string;
  
  version: number;
  sections: ContractSection[];
}

export interface CreateContractRequest {
  // Optional: when omitted a project is auto-created from the contract (see createContract).
  project_id?: number | null; title: string; client_id: number;
  site_location?: string | null; delivered_product?: string | null;
  sale_price?: number | null; execution_term?: string | null;
  pif_term?: string | null; observations?: string | null;
}

export interface UpdateContractSectionInput {
  id: number; content: string;
}

export interface UpdateContractRequest {
  id: number; title?: string | null; site_location?: string | null;
  delivered_product?: string | null; sale_price?: number | null;
  execution_term?: string | null; pif_term?: string | null;
  status?: string | null; observations?: string | null;
  sections?: UpdateContractSectionInput[] | null;
  

  expected_version?: number;
}

export interface ContractRevision {
  id: number; contract_id: number; revision: number;
  changed_by_name: string | null; changed_at: string; notes: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
const CONTRACT_SQL = `SELECT c.id, c.project_id, p.name as project_name, c.contract_code, c.title, c.client_id, cl.name as client_name,
       c.site_location, c.delivered_product, c.sale_price, c.execution_term, c.pif_term,
       c.status, c.revision, c.observations, u.full_name as created_by_name, c.created_at, c.updated_at, c.version
FROM contracts c JOIN projects p ON p.id = c.project_id
JOIN clients cl ON cl.id = c.client_id LEFT JOIN users u ON u.id = c.created_by`;

function mapContract(row: any): Contract {
  return {
    id: row.id as number, project_id: row.project_id as number, project_name: row.project_name as string,
    contract_code: row.contract_code as string, title: row.title as string,
    client_id: row.client_id as number, client_name: row.client_name as string,
    site_location: row.site_location as string | null, delivered_product: row.delivered_product as string | null,
    sale_price: (row.sale_price as number) || 0, execution_term: row.execution_term as string | null,
    pif_term: row.pif_term as string | null, status: row.status as string,
    revision: (row.revision as number) || 0, observations: row.observations as string | null,
    created_by_name: row.created_by_name as string | null,
    created_at: row.created_at as string, updated_at: row.updated_at as string,
    version: (row.version as number) ?? 0,
    sections: [],
  };
}





export class ContractService {
  static getSectionTemplates(db: Database): ContractSectionTemplate[] {
    return queryRows(db,
      'SELECT id, name, default_content, order_index, required FROM contract_section_templates ORDER BY order_index',
      [],
      (row) => ({ ...row, required: !!(row.required as number) } as ContractSectionTemplate)
    );
  }

  static getContracts(db: Database): Contract[] {
    return queryRows(db, `${CONTRACT_SQL} ORDER BY c.updated_at DESC`, [], mapContract);
  }

  static getContract(db: Database, contractId: number): Contract {
    const contract = queryOne(db, `${CONTRACT_SQL} WHERE c.id = ?`, [contractId], mapContract);
    if (!contract) throw CommandError.notFound('Contract negasit');

    contract.sections = queryRows(db,
      'SELECT id, contract_id, template_id, title, content, order_index, required FROM contract_sections WHERE contract_id = ? ORDER BY order_index',
      [contractId],
      (row) => ({ ...row, required: !!(row.required as number) } as ContractSection)
    );

    return contract;
  }

  static getContractByProject(db: Database, projectId: number): Contract {
    const contractId = queryOne(db, 'SELECT id FROM contracts WHERE project_id = ?', [projectId], r => r.id as number);
    if (!contractId) throw CommandError.notFound('Proiectul nu are contract');
    return this.getContract(db, contractId);
  }

  static createContract(db: Database, user: UserWithRole, req: CreateContractRequest): Contract {
    if (!req.title?.trim()) throw CommandError.badRequest('Titlul contractului este obligatoriu');
    if (!req.client_id) throw CommandError.badRequest('Clientul este obligatoriu');

    // Contract header, its auto-created project (if any) and its seeded sections
    // must be atomic — a section insert failing mid-loop previously left a
    // contract with no/partial sections (same fix as goods receipt, audit 2026-06-11);
    // and a rollback must also undo a project spun up only for this contract.
    db.run('BEGIN');
    let contractId: number;
    try {
      // A contract can be the starting point of the workflow: if no project was
      // chosen, spin one up automatically (named after the contract, linked to the
      // same client) so the user no longer has to create a project beforehand.
      // Reuses ProjectService.create for full consistency (defaults, activity,
      // audit, notebook stages) and its manage_projects permission gate.
      let projectId = req.project_id ?? null;
      if (!projectId) {
        const project = ProjectService.create(db, {
          name: req.title.trim(),
          client_id: req.client_id,
          description: 'Proiect creat automat odată cu contractul.',
          // Contractul e sursa de venit a proiectului → propagă prețul de vânzare
          // în valoarea estimată (altfel forecast-ul de venituri rămânea 0).
          estimated_value: req.sale_price ?? 0,
        }, user);
        projectId = project.id;
      } else {
        const exists = queryOne(db, 'SELECT COUNT(*) as cnt FROM contracts WHERE project_id = ?', [projectId], r => r.cnt as number);
        if (exists && exists > 0) throw CommandError.conflict('Proiectul are deja un contract');
      }

      const next = (queryOne(db, 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM contracts', [], r => r.next_id as number)) || 1;
      const code = `CTR-${String(next).padStart(4, '0')}`;

      db.run(
        `INSERT INTO contracts (project_id, contract_code, title, client_id, site_location, delivered_product, sale_price, execution_term, pif_term, observations, created_by, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [projectId, code, req.title, req.client_id, req.site_location ?? null,
         req.delivered_product ?? null, req.sale_price ?? 0, req.execution_term ?? null,
         req.pif_term ?? null, req.observations ?? null, user.id]
      );
      contractId = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;

      const templates = queryRows(db,
        'SELECT id, name, default_content, order_index, required FROM contract_section_templates ORDER BY order_index',
        [],
        (row) => ({ id: row.id as number, name: row.name as string, content: row.default_content as string, order: row.order_index as number, required: row.required as number })
      );

      for (const tmpl of templates) {
        db.run(
          'INSERT INTO contract_sections (contract_id, template_id, title, content, order_index, required) VALUES (?, ?, ?, ?, ?, ?)',
          [contractId, tmpl.id, tmpl.name, tmpl.content, tmpl.order, tmpl.required]
        );
      }

      db.run('COMMIT');
    } catch (err) {
      try { db.run('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }

    return this.getContract(db, contractId);
  }

  static updateContract(db: Database, req: UpdateContractRequest): Contract {
    if (req.expected_version !== undefined) {
      const existing = this.getContract(db, req.id);
      if (existing.version !== req.expected_version) {
        throw CommandError.conflict(
          'Contractul a fost modificat de alt utilizator între timp. Reîncarcă și încearcă din nou.'
        );
      }
    }

    db.run(
      `UPDATE contracts SET
          title = COALESCE(?, title), site_location = COALESCE(?, site_location),
          delivered_product = COALESCE(?, delivered_product), sale_price = COALESCE(?, sale_price),
          execution_term = COALESCE(?, execution_term), pif_term = COALESCE(?, pif_term),
          status = COALESCE(?, status), observations = COALESCE(?, observations),
          version = version + 1, updated_at = datetime('now')
       WHERE id = ?`,
      [req.title ?? null, req.site_location ?? null, req.delivered_product ?? null,
       req.sale_price ?? null, req.execution_term ?? null, req.pif_term ?? null,
       req.status ?? null, req.observations ?? null, req.id]
    );

    if (req.sections) {
      for (const s of req.sections) {
        db.run('UPDATE contract_sections SET content = ? WHERE id = ? AND contract_id = ?',
          [s.content, s.id, req.id]);
      }
    }

    return this.getContract(db, req.id);
  }

  static createRevision(db: Database, user: UserWithRole, contractId: number, notes: string | null): Contract {
    const contract = this.getContract(db, contractId);
    const snapshot = JSON.stringify(contract);
    const revision = contract.revision;

    db.run(
      'INSERT INTO contract_revisions (contract_id, revision, snapshot_json, changed_by, notes) VALUES (?, ?, ?, ?, ?)',
      [contractId, revision, snapshot, user.id, notes]
    );

    db.run(
      "UPDATE contracts SET revision = revision + 1, updated_at = datetime('now') WHERE id = ?",
      [contractId]
    );

    return this.getContract(db, contractId);
  }

  static getRevisions(db: Database, contractId: number): ContractRevision[] {
    return queryRows(db,
      `SELECT cr.id, cr.contract_id, cr.revision, u.full_name as changed_by_name, cr.changed_at, cr.notes
       FROM contract_revisions cr LEFT JOIN users u ON u.id = cr.changed_by
       WHERE cr.contract_id = ? ORDER BY cr.revision DESC`,
      [contractId],
      (row) => row as ContractRevision
    );
  }

  
  
  
  
  

  static listAttachments(db: Database, contractId: number): Array<{
    id: number; contract_id: number; filename: string | null; mime: string | null;
    size: number; created_by_name: string | null; created_at: string;
  }> {
    return queryRows(db,
      `SELECT ca.id, ca.contract_id, ca.filename, ca.mime, LENGTH(ca.data) AS size,
              u.full_name AS created_by_name, ca.created_at
       FROM contract_attachments ca
       LEFT JOIN users u ON u.id = ca.created_by_user_id
       WHERE ca.contract_id = ?
       ORDER BY ca.created_at DESC, ca.id DESC`,
      [contractId],
      (r) => ({
        id: r.id as number,
        contract_id: r.contract_id as number,
        filename: (r.filename as string | null) ?? null,
        mime: (r.mime as string | null) ?? null,
        size: (r.size as number) ?? 0,
        created_by_name: (r.created_by_name as string | null) ?? null,
        created_at: r.created_at as string,
      })
    );
  }

  static addAttachment(db: Database, user: UserWithRole, req: {
    contract_id: number; filename?: string | null; mime?: string | null; data: string;
  }): { id: number } {
    if (!req.contract_id) throw CommandError.badRequest('contract_id obligatoriu');
    if (!req.data || typeof req.data !== 'string') throw CommandError.badRequest('Fișier lipsă');
    
    
    
    const MAX_CHARS = 50 * 1024 * 1024;
    if (req.data.length > MAX_CHARS) throw CommandError.badRequest('Fișier prea mare');
    db.run(
      `INSERT INTO contract_attachments (contract_id, filename, mime, data, created_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [req.contract_id, req.filename ?? null, req.mime ?? null, req.data, user.id]
    );
    const id = (queryOne(db, 'SELECT last_insert_rowid() as id', [], r => r.id as number))!;
    return { id };
  }

  static getAttachment(db: Database, attachmentId: number): {
    id: number; filename: string | null; mime: string | null; base64: string;
  } {
    const row = queryOne(db,
      'SELECT id, filename, mime, data FROM contract_attachments WHERE id = ?',
      [attachmentId],
      (r) => ({
        id: r.id as number,
        filename: (r.filename as string | null) ?? null,
        mime: (r.mime as string | null) ?? null,
        base64: r.data as string,
      })
    );
    if (!row) throw CommandError.notFound('Fișier negăsit');
    return row;
  }

  static deleteAttachment(db: Database, attachmentId: number): void {
    db.run('DELETE FROM contract_attachments WHERE id = ?', [attachmentId]);
  }
}
