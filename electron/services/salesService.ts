import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr, validateNumber, validateEnum, validateDate } from '../middleware/validate';
import type { UserWithRole } from './authService';
import { logAuditEvent } from '../db/auditLogs';



const LEAD_STATUSES = [
  'fara_contact', 'decizie_client', 'decizie_noastra', 'in_negocieri', 'convertit', 'inchis',
] as const;





export interface LeadNote {
  id: number;
  content: string;
  created_by_name: string | null;
  created_at: string;
}

export interface SalesLead {
  id: number;
  client_name: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  product_interest: string | null;
  estimated_value: number;
  location: string | null;
  status: string;
  notes: string | null;
  last_contact_date: string | null;
  next_followup_date: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  converted_project_id: number | null;
  converted_project_name: string | null;
  


  converted_project_status: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  recent_notes: LeadNote[];
}

export interface CreateLeadRequest {
  client_name: string;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  product_interest?: string | null;
  estimated_value?: number;
  location?: string | null;
  status?: string | null;
  notes?: string | null;
  next_followup_date?: string | null;
}

export interface UpdateLeadRequest {
  id: number;
  client_name?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  product_interest?: string | null;
  estimated_value?: number | null;
  location?: string | null;
  status?: string | null;
  notes?: string | null;
  last_contact_date?: string | null;
  next_followup_date?: string | null;
}

export interface AddLeadNoteRequest {
  lead_id: number;
  content: string;
}

export interface ConvertLeadRequest {
  lead_id: number;
  project_name: string;
  estimated_value?: number;
}

export interface SalesStats {
  total_leads: number;
  fara_contact: number;
  decizie_client: number;
  decizie_noastra: number;
  in_negocieri: number;
  converted: number;
  pipeline_value: number;
  stale_leads: number;
}










const SELECT_SQL = `SELECT l.id, l.client_name, l.contact_person, l.contact_email, l.contact_phone,
        l.product_interest, l.estimated_value, l.location, l.status, l.notes,
        l.last_contact_date, l.next_followup_date, l.assigned_to, ua.full_name,
        l.converted_project_id, p.name, uc.full_name, l.created_at, l.updated_at,
        p.status as project_status
 FROM sales_leads l
 LEFT JOIN users ua ON ua.id = l.assigned_to
 LEFT JOIN projects p ON p.id = l.converted_project_id
 LEFT JOIN users uc ON uc.id = l.created_by`;

function rowToLead(row: any[]): SalesLead {
  return {
    id: row[0] as number,
    client_name: row[1] as string,
    contact_person: row[2] as string | null,
    contact_email: row[3] as string | null,
    contact_phone: row[4] as string | null,
    product_interest: row[5] as string | null,
    estimated_value: (row[6] as number) || 0,
    location: row[7] as string | null,
    status: row[8] as string,
    notes: row[9] as string | null,
    last_contact_date: row[10] as string | null,
    next_followup_date: row[11] as string | null,
    assigned_to: row[12] as number | null,
    assigned_to_name: row[13] as string | null,
    converted_project_id: row[14] as number | null,
    converted_project_name: row[15] as string | null,
    created_by_name: row[16] as string | null,
    created_at: row[17] as string,
    updated_at: row[18] as string,
    converted_project_status: row[19] as string | null,
    recent_notes: [],
  };
}

function qNumber(db: Database, sql: string, params: any[] = []): number {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let val = 0;
  if (stmt.step()) { val = (stmt.get()[0] as number) || 0; }
  stmt.free();
  return val;
}

function qNumberF(db: Database, sql: string, params: any[] = []): number {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let val = 0;
  if (stmt.step()) { val = (stmt.get()[0] as number) || 0; }
  stmt.free();
  return val;
}





export class SalesService {
  





  private static canSeeAllLeads(user: UserWithRole): boolean {
    return ['admin', 'manager'].includes((user.role_name || '').toLowerCase());
  }

  static getAll(db: Database, user: UserWithRole): SalesLead[] {
    const orderBy = ` ORDER BY CASE l.status WHEN 'fara_contact' THEN 0 WHEN 'decizie_noastra' THEN 1 WHEN 'in_negocieri' THEN 2 WHEN 'decizie_client' THEN 3 ELSE 4 END, l.updated_at DESC`;

    let sql: string;
    const params: any[] = [];
    if (this.canSeeAllLeads(user)) {
      sql = SELECT_SQL + orderBy;
    } else {
      
      
      sql = `${SELECT_SQL} WHERE l.created_by = ? OR l.assigned_to = ?${orderBy}`;
      params.push(user.id, user.id);
    }

    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const leads: SalesLead[] = [];
    while (stmt.step()) {
      leads.push(rowToLead(stmt.get()));
    }
    stmt.free();

    
    
    
    const showCreatorMeta = this.canSeeAllLeads(user);

    
    for (const lead of leads) {
      lead.recent_notes = this.getNotes(db, lead.id);
      if (!showCreatorMeta) lead.created_by_name = null;
    }

    return leads;
  }

  static getLead(db: Database, user: UserWithRole, id: number): SalesLead {
    
    
    this.assertCanRead(db, user, id);

    const stmt = db.prepare(`${SELECT_SQL} WHERE l.id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Lead negasit');
    }
    const lead = rowToLead(stmt.get());
    stmt.free();
    lead.recent_notes = this.getNotes(db, id);
    return lead;
  }

  static getNotes(db: Database, leadId: number): LeadNote[] {
    const stmt = db.prepare(
      `SELECT n.id, n.content, u.full_name, n.created_at
       FROM sales_lead_notes n LEFT JOIN users u ON u.id = n.created_by
       WHERE n.lead_id = ? ORDER BY n.created_at DESC LIMIT 10`
    );
    stmt.bind([leadId]);
    const notes: LeadNote[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      notes.push({
        id: row[0] as number,
        content: row[1] as string,
        created_by_name: row[2] as string | null,
        created_at: row[3] as string,
      });
    }
    stmt.free();
    return notes;
  }

  static create(db: Database, user: UserWithRole, req: CreateLeadRequest): SalesLead {
    const v = {
      client_name: capStr(req.client_name, 250, 'client_name', { required: true })!,
      contact_person: capStr(req.contact_person, 200, 'contact_person'),
      contact_email: capStr(req.contact_email, 254, 'contact_email'),
      contact_phone: capStr(req.contact_phone, 50, 'contact_phone'),
      product_interest: capStr(req.product_interest, 500, 'product_interest'),
      estimated_value: validateNumber(req.estimated_value, 'estimated_value', { min: 0, max: 1e10 }) ?? 0,
      location: capStr(req.location, 200, 'location'),
      status: validateEnum(req.status, LEAD_STATUSES, 'fara_contact', 'status')!,
      notes: capStr(req.notes, 20_000, 'notes'),
      next_followup_date: validateDate(req.next_followup_date, 'next_followup_date'),
    };

    db.run(
      `INSERT INTO sales_leads (client_name, contact_person, contact_email, contact_phone, product_interest, estimated_value, location, status, notes, next_followup_date, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.client_name, v.contact_person, v.contact_email, v.contact_phone,
       v.product_interest, v.estimated_value, v.location, v.status, v.notes,
       v.next_followup_date, user.id, user.id]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();

    return this.getLead(db, user, id);
  }

  static update(db: Database, user: UserWithRole, req: UpdateLeadRequest): SalesLead {
    this.assertCanModify(db, user, req.id);
    const v = {
      client_name: capStr(req.client_name, 250, 'client_name'),
      contact_person: capStr(req.contact_person, 200, 'contact_person'),
      contact_email: capStr(req.contact_email, 254, 'contact_email'),
      contact_phone: capStr(req.contact_phone, 50, 'contact_phone'),
      product_interest: capStr(req.product_interest, 500, 'product_interest'),
      estimated_value: validateNumber(req.estimated_value, 'estimated_value', { min: 0, max: 1e10 }),
      location: capStr(req.location, 200, 'location'),
      status: validateEnum(req.status, LEAD_STATUSES, null, 'status'),
      notes: capStr(req.notes, 20_000, 'notes'),
      last_contact_date: validateDate(req.last_contact_date, 'last_contact_date'),
      next_followup_date: validateDate(req.next_followup_date, 'next_followup_date'),
    };
    db.run(
      `UPDATE sales_leads SET client_name=COALESCE(?,client_name), contact_person=COALESCE(?,contact_person),
       contact_email=COALESCE(?,contact_email), contact_phone=COALESCE(?,contact_phone),
       product_interest=COALESCE(?,product_interest), estimated_value=COALESCE(?,estimated_value),
       location=COALESCE(?,location), status=COALESCE(?,status), notes=COALESCE(?,notes),
       last_contact_date=COALESCE(?,last_contact_date), next_followup_date=COALESCE(?,next_followup_date),
       updated_at=datetime('now') WHERE id=?`,
      [v.client_name, v.contact_person, v.contact_email, v.contact_phone,
       v.product_interest, v.estimated_value, v.location, v.status,
       v.notes, v.last_contact_date, v.next_followup_date, req.id]
    );

    return this.getLead(db, user, req.id);
  }

  static addNote(db: Database, user: UserWithRole, req: AddLeadNoteRequest): SalesLead {
    this.assertCanModify(db, user, req.lead_id);
    const content = capStr(req.content, 10_000, 'content', { required: true })!;
    db.run(
      'INSERT INTO sales_lead_notes (lead_id, content, created_by) VALUES (?, ?, ?)',
      [req.lead_id, content, user.id]
    );
    db.run(
      "UPDATE sales_leads SET last_contact_date = date('now'), updated_at = datetime('now') WHERE id = ?",
      [req.lead_id]
    );
    return this.getLead(db, user, req.lead_id);
  }

  





  private static assertCanModify(db: Database, user: UserWithRole, leadId: number): void {
    const role = (user.role_name || '').toLowerCase();
    
    
    
    
    
    if (role === 'admin' || role === 'manager') return;
    const stmt = db.prepare('SELECT created_by, assigned_to FROM sales_leads WHERE id = ?');
    stmt.bind([leadId]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Lead-ul nu există');
    }
    const row = stmt.get() as Array<unknown>;
    stmt.free();
    const createdBy = row[0] as number | null;
    const assignedTo = row[1] as number | null;
    if (createdBy === user.id || assignedTo === user.id) return;
    throw CommandError.forbidden('Nu ai permisiuni să modifici acest lead');
  }

  




  private static assertCanRead(db: Database, user: UserWithRole, leadId: number): void {
    const role = (user.role_name || '').toLowerCase();
    if (role === 'admin' || role === 'manager') return;
    const stmt = db.prepare('SELECT created_by, assigned_to FROM sales_leads WHERE id = ?');
    stmt.bind([leadId]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Lead negasit'); }
    const row = stmt.get() as Array<unknown>;
    stmt.free();
    const createdBy = row[0] as number | null;
    const assignedTo = row[1] as number | null;
    if (createdBy === user.id || assignedTo === user.id) return;
    
    throw CommandError.notFound('Lead negasit');
  }

  static convertToProject(db: Database, user: UserWithRole, req: ConvertLeadRequest): SalesLead {
    const lead = this.getLead(db, user, req.lead_id);
    if (lead.converted_project_id != null) {
      throw CommandError.conflict('Lead-ul a fost deja convertit');
    }

    
    let clientId: number;
    const clientStmt = db.prepare('SELECT id FROM clients WHERE name = ?');
    clientStmt.bind([lead.client_name]);
    if (clientStmt.step()) {
      clientId = clientStmt.get()[0] as number;
      clientStmt.free();
    } else {
      clientStmt.free();
      db.run(
        'INSERT INTO clients (name, contact_person, email, phone, city) VALUES (?, ?, ?, ?, ?)',
        [lead.client_name, lead.contact_person, lead.contact_email, lead.contact_phone, lead.location]
      );
      const idStmt = db.prepare('SELECT last_insert_rowid()');
      idStmt.step();
      clientId = idStmt.get()[0] as number;
      idStmt.free();
    }

    
    const value = req.estimated_value ?? lead.estimated_value;
    db.run(
      `INSERT INTO projects (name, client_id, status, priority, manager_id, estimated_value, description)
       VALUES (?, ?, 'ofertă', 'medium', ?, ?, ?)`,
      [req.project_name, clientId, user.id, value, lead.product_interest]
    );
    const pIdStmt = db.prepare('SELECT last_insert_rowid()');
    pIdStmt.step();
    const projectId = pIdStmt.get()[0] as number;
    pIdStmt.free();

    
    
    
    if (value > 0) {
      const today = new Date().toISOString().split('T')[0];
      db.run(
        `INSERT INTO project_revenues (project_id, amount, source, date, notes, created_by)
         VALUES (?, ?, 'sales_lead', ?, ?, ?)`,
        [projectId, value, today, `Estimare initiala din lead #${req.lead_id}`, user.id]
      );
    }

    
    db.run(
      "UPDATE sales_leads SET converted_project_id = ?, status = 'convertit', updated_at = datetime('now') WHERE id = ?",
      [projectId, req.lead_id]
    );

    return this.getLead(db, user, req.lead_id);
  }

  static delete(db: Database, user: UserWithRole, id: number): void {
    this.assertCanModify(db, user, id);
    try { db.run('DELETE FROM sales_lead_notes WHERE lead_id = ?', [id]); } catch {  }
    try { db.run('DELETE FROM lead_attachments WHERE lead_id = ?', [id]); } catch {  }
    db.run('DELETE FROM sales_leads WHERE id = ?', [id]);
    // Hard delete leaves no domain trace — audit who removed which lead.
    logAuditEvent(db, user.id, 'DELETE', 'sales_lead', id, null);
  }

  
  
  

  static listAttachments(db: Database, _user: UserWithRole, leadId: number): Array<{
    id: number; lead_id: number; kind: string; filename: string | null;
    data: string; caption: string | null; created_by_user_id: number | null;
    created_by_name: string | null; created_at: string;
  }> {
    const stmt = db.prepare(
      `SELECT la.id, la.lead_id, la.kind, la.filename, la.data, la.caption,
              la.created_by_user_id, u.full_name AS created_by_name, la.created_at
       FROM lead_attachments la
       LEFT JOIN users u ON u.id = la.created_by_user_id
       WHERE la.lead_id = ?
       ORDER BY la.created_at DESC`,
    );
    stmt.bind([leadId]);
    const out: any[] = [];
    while (stmt.step()) out.push(stmt.getAsObject());
    stmt.free();
    return out.map(r => ({
      id: r.id as number,
      lead_id: r.lead_id as number,
      kind: r.kind as string,
      filename: (r.filename as string | null) ?? null,
      data: r.data as string,
      caption: (r.caption as string | null) ?? null,
      created_by_user_id: (r.created_by_user_id as number | null) ?? null,
      created_by_name: (r.created_by_name as string | null) ?? null,
      created_at: r.created_at as string,
    }));
  }

  static addAttachment(db: Database, user: UserWithRole, req: {
    lead_id: number; kind?: string; filename?: string | null;
    data: string; caption?: string | null;
  }): { id: number } {
    if (!req.lead_id) throw CommandError.badRequest('lead_id obligatoriu');
    this.assertCanModify(db, user, req.lead_id);
    
    
    
    
    
    
    
    
    const ATTACHMENT_MAX_CHARS = 500 * 1024 * 1024;
    const v = {
      kind: capStr(req.kind, 32, 'kind') || 'photo',
      filename: capStr(req.filename, 255, 'filename'),
      data: capStr(req.data, ATTACHMENT_MAX_CHARS, 'data', { required: true, trim: false })!,
      caption: capStr(req.caption, 1000, 'caption'),
    };
    db.run(
      `INSERT INTO lead_attachments (lead_id, kind, filename, data, caption, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.lead_id, v.kind,
        v.filename, v.data,
        v.caption, user.id,
      ],
    );
    const idStmt = db.prepare('SELECT last_insert_rowid() AS id');
    idStmt.step();
    const id = idStmt.getAsObject().id as number;
    idStmt.free();
    return { id };
  }

  static deleteAttachment(db: Database, user: UserWithRole, attachmentId: number): void {
    
    const stmt = db.prepare('SELECT lead_id FROM lead_attachments WHERE id = ?');
    stmt.bind([attachmentId]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Atașamentul nu există');
    }
    const leadId = stmt.get()[0] as number;
    stmt.free();
    this.assertCanModify(db, user, leadId);
    db.run('DELETE FROM lead_attachments WHERE id = ?', [attachmentId]);
  }

  static getStats(db: Database, user: UserWithRole): SalesStats {
    
    
    
    
    
    const isAdminOrManager = ['admin', 'manager'].includes(user.role_name.toLowerCase());
    const filter = isAdminOrManager ? '' : ' AND (created_by = ? OR assigned_to = ?)';
    const params: number[] = isAdminOrManager ? [] : [user.id, user.id];

    const total = qNumber(db, `SELECT COUNT(*) FROM sales_leads WHERE status != 'convertit'${filter}`, params);
    const fara_contact = qNumber(db, `SELECT COUNT(*) FROM sales_leads WHERE status = 'fara_contact'${filter}`, params);
    const decizie_client = qNumber(db, `SELECT COUNT(*) FROM sales_leads WHERE status = 'decizie_client'${filter}`, params);
    const decizie_noastra = qNumber(db, `SELECT COUNT(*) FROM sales_leads WHERE status = 'decizie_noastra'${filter}`, params);
    const in_negocieri = qNumber(db, `SELECT COUNT(*) FROM sales_leads WHERE status = 'in_negocieri'${filter}`, params);
    const converted = qNumber(db, `SELECT COUNT(*) FROM sales_leads WHERE status = 'convertit'${filter}`, params);
    
    
    const leads_pipeline = qNumberF(db, `SELECT COALESCE(SUM(estimated_value), 0) FROM sales_leads WHERE status != 'convertit'${filter}`, params);
    const converted_projects_value = qNumberF(db, `
      SELECT COALESCE(SUM(p.estimated_value), 0)
      FROM projects p
      WHERE p.id IN (SELECT converted_project_id FROM sales_leads WHERE converted_project_id IS NOT NULL)
        AND p.status NOT IN ('finalizat', 'anulat')
    `);
    const pipeline_value = leads_pipeline + converted_projects_value;
    const stale_leads = qNumber(db,
      `SELECT COUNT(*) FROM sales_leads
       WHERE status NOT IN ('convertit')
         AND COALESCE(last_contact_date, created_at) < date('now', '-7 days')
       ${filter}`, params);

    return {
      total_leads: total,
      fara_contact,
      decizie_client,
      decizie_noastra,
      in_negocieri,
      converted,
      pipeline_value,
      stale_leads,
    };
  }
}
