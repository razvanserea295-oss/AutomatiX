/**
 * FisaTemplatesService — global catalog of fișă proiectant templates.
 *
 * Templates are GLOBAL (anyone sees all, per Q18). Anyone can create a
 * template (Q7); only the author or an admin can edit / delete (soft
 * delete via `active = 0`).
 *
 * `getOrCreateDefault()` is the lazy seeder for the existing "Stație
 * betoane M60" structure — invoked the first time anyone lists or
 * creates a fișă so the user always has at least one template to pick.
 *
 * Schema shape:
 *   {
 *     "tracking": [<Assembly>...],   // optional — the matrix tab
 *     "specs":    { header: {...}, sections: [...] }   // free-form tab
 *   }
 *
 * Both halves are optional in a template — minimal templates can be
 * tracking-only or specs-only.
 */

import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';

export interface FisaTemplate {
  id: number;
  name: string;
  description: string | null;
  schema_json: string;
  


  column_weights_json: string | null;
  created_by_user_id: number | null;
  created_by_name: string | null;
  is_default: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}


const FISA_COLUMNS = ['proiect', 'dxf', 'desene', 'executie', 'livrat'] as const;







function normalizeColumnWeights(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  let obj: any = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { throw CommandError.badRequest('column_weights_json invalid'); }
  }
  if (typeof obj !== 'object' || obj === null) throw CommandError.badRequest('column_weights_json invalid');
  const out: Record<string, number> = {};
  let sum = 0;
  for (const c of FISA_COLUMNS) {
    const v = Number(obj[c]);
    if (!Number.isFinite(v) || v < 0) throw CommandError.badRequest(`Pondere invalidă pentru coloana „${c}"`);
    out[c] = v;
    sum += v;
  }
  
  if (Math.abs(sum - 100) > 0.5) {
    throw CommandError.badRequest(`Ponderile coloanelor trebuie să însumeze 100% (acum ${sum})`);
  }
  return JSON.stringify(out);
}

function mapRow(row: any): FisaTemplate {
  return {
    id: row.id as number,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    schema_json: row.schema_json as string,
    column_weights_json: (row.column_weights_json as string | null) ?? null,
    created_by_user_id: (row.created_by_user_id as number | null) ?? null,
    created_by_name: (row.created_by_name as string | null) ?? null,
    is_default: !!(row.is_default as number),
    active: !!(row.active as number),
    sort_order: (row.sort_order as number) || 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

const SELECT_SQL = `SELECT t.*, u.full_name AS created_by_name
                    FROM fisa_templates t
                    LEFT JOIN users u ON u.id = t.created_by_user_id`;

export class FisaTemplatesService {
  



  static list(db: Database, _user: UserWithRole, includeInactive = false): FisaTemplate[] {
    this.ensureDefaultTemplate(db);
    const sql = includeInactive
      ? `${SELECT_SQL} ORDER BY t.is_default DESC, t.sort_order, t.name`
      : `${SELECT_SQL} WHERE t.active = 1 ORDER BY t.is_default DESC, t.sort_order, t.name`;
    const stmt = db.prepare(sql);
    const out: FisaTemplate[] = [];
    while (stmt.step()) out.push(mapRow(stmt.getAsObject()));
    stmt.free();
    return out;
  }

  static get(db: Database, _user: UserWithRole, id: number): FisaTemplate {
    const stmt = db.prepare(`${SELECT_SQL} WHERE t.id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); throw CommandError.notFound('Template inexistent'); }
    const row = mapRow(stmt.getAsObject());
    stmt.free();
    return row;
  }

  static create(
    db: Database, user: UserWithRole,
    req: { name: string; description?: string | null; schema_json: string; sort_order?: number; column_weights_json?: unknown },
  ): FisaTemplate {
    const name = (req.name || '').trim();
    if (!name) throw CommandError.badRequest('Numele template-ului e obligatoriu');
    if (!req.schema_json) throw CommandError.badRequest('Schema lipsă');
    
    
    try {
      const parsed = JSON.parse(req.schema_json);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('not object');
      
      
    } catch {
      throw CommandError.badRequest('Schema JSON invalidă');
    }
    const weights = normalizeColumnWeights(req.column_weights_json);
    db.run(
      `INSERT INTO fisa_templates (name, description, schema_json, column_weights_json, created_by_user_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, req.description ?? null, req.schema_json, weights, user.id, req.sort_order ?? 0],
    );
    const id = this.lastId(db);
    return this.get(db, user, id);
  }

  static update(
    db: Database, user: UserWithRole,
    req: { id: number; name?: string; description?: string | null; schema_json?: string; sort_order?: number; column_weights_json?: unknown },
  ): FisaTemplate {
    const existing = this.get(db, user, req.id);
    const isAdmin = (user.role_name || '').toLowerCase() === 'admin';
    if (!isAdmin && existing.created_by_user_id !== user.id) {
      throw CommandError.forbidden('Doar autorul sau adminul poate edita template-ul');
    }
    if (req.schema_json) {
      try { JSON.parse(req.schema_json); }
      catch { throw CommandError.badRequest('Schema JSON invalidă'); }
    }
    const sets: string[] = [];
    const params: any[] = [];
    const setField = (col: string, val: any) => { sets.push(`${col} = ?`); params.push(val); };
    if (req.name !== undefined)        setField('name', String(req.name).trim());
    if (req.description !== undefined) setField('description', req.description);
    if (req.schema_json !== undefined) setField('schema_json', req.schema_json);
    if (req.sort_order !== undefined)  setField('sort_order', req.sort_order);
    if (req.column_weights_json !== undefined) setField('column_weights_json', normalizeColumnWeights(req.column_weights_json));
    if (sets.length === 0) return existing;
    sets.push("updated_at = datetime('now')");
    params.push(req.id);
    db.run(`UPDATE fisa_templates SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.get(db, user, req.id);
  }

  




  static delete(db: Database, user: UserWithRole, id: number): void {
    const existing = this.get(db, user, id);
    const isAdmin = (user.role_name || '').toLowerCase() === 'admin';
    if (!isAdmin && existing.created_by_user_id !== user.id) {
      throw CommandError.forbidden('Doar autorul sau adminul poate șterge template-ul');
    }
    if (existing.is_default) {
      throw CommandError.badRequest('Template-ul default nu poate fi șters');
    }
    db.run(
      `UPDATE fisa_templates SET active = 0, updated_at = datetime('now') WHERE id = ?`,
      [id],
    );
  }

  
  static clone(db: Database, user: UserWithRole, id: number, newName?: string): FisaTemplate {
    const src = this.get(db, user, id);
    return this.create(db, user, {
      name: newName || `${src.name} (copie)`,
      description: src.description,
      schema_json: src.schema_json,
      column_weights_json: src.column_weights_json,
      sort_order: src.sort_order + 1,
    });
  }

  
  static ensureDefaultTemplate(db: Database): FisaTemplate {
    const stmt = db.prepare('SELECT id FROM fisa_templates WHERE is_default = 1 LIMIT 1');
    if (stmt.step()) {
      const id = stmt.get()[0] as number;
      stmt.free();
      const sysUser = { role_name: 'admin' } as UserWithRole;
      return this.get(db, sysUser, id);
    }
    stmt.free();

    
    const schema = this.buildLegacyDefaultSchema();
    db.run(
      `INSERT INTO fisa_templates (name, description, schema_json, is_default, sort_order)
       VALUES (?, ?, ?, 1, 0)`,
      [
        'Stație betoane M60 (implicit)',
        'Template implicit pentru stații de betoane — tracking 10 ansambluri + 13 secțiuni specs.',
        schema,
      ],
    );
    const newId = this.lastId(db);
    return this.get(db, { role_name: 'admin' } as UserWithRole, newId);
  }

  private static lastId(db: Database): number {
    const s = db.prepare('SELECT last_insert_rowid()');
    s.step();
    const id = s.get()[0] as number;
    s.free();
    return id;
  }

  




  private static buildLegacyDefaultSchema(): string {
    const tracking = [
      { id: '1', assembly: 'Sasiu statie', zincare: false, culoare: '', subs: [
        { id: '1.1', name: 'Sasiu', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
      { id: '2', assembly: 'Predozare', zincare: false, culoare: '', subs: [
        { id: '2.1', name: 'Structura',  proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '2.2', name: 'Cuve',       proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '2.3', name: 'Inchizator', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
      { id: '3', assembly: 'Banda Cantar', zincare: false, culoare: '', subs: [
        { id: '3.1', name: 'Sasiu banda', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '3.2', name: 'Banda+rola',  proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
      { id: '4', assembly: 'Banda Transport', zincare: false, culoare: '', subs: [
        { id: '4.1', name: 'Banda inclinata', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '4.2', name: 'Roti capete',    proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
      { id: '5', assembly: 'Malaxor', zincare: false, culoare: '', subs: [
        { id: '5.1', name: 'Cuva malaxor', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '5.2', name: 'Brate amestec', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '5.3', name: 'Reductor',      proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
      { id: '6', assembly: 'Turn malaxor', zincare: false, culoare: '', subs: [
        { id: '6.1', name: 'Structura turn', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '6.2', name: 'Acoperis',       proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
      { id: '7', assembly: 'Turn nivel 2', zincare: false, culoare: '', subs: [
        { id: '7.1', name: 'Structura', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
      { id: '8', assembly: 'Cantare', zincare: false, culoare: '', subs: [
        { id: '8.1', name: 'Cantar ciment', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '8.2', name: 'Cantar apa',    proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '8.3', name: 'Cantar aditivi',proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
      { id: '9', assembly: 'Snecuri', zincare: false, culoare: '', subs: [
        { id: '9.1', name: 'Snec ciment', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
      { id: '10', assembly: 'Silozuri', zincare: false, culoare: '', subs: [
        { id: '10.1', name: 'Siloz 1', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '10.2', name: 'Siloz 2', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ] },
    ];

    const specs = {
      header: {
        tip_statie: '', loc: '', beneficiar: '', completat: '',
        ing_proiect: '', data_inceput: '', data_finalizare: '',
      },
      sections: [
        { id: '1', title: 'Sasiu statie', fields: [
          { key: 'sasiu_da_nu', label: 'Sasiu prevazut', type: 'select', options: ['DA', 'NU'], value: '' },
        ] },
        { id: '2', title: 'Predozare', fields: [
          { key: 'zincare', label: 'Zincare', type: 'checkbox', value: false },
          { key: 'material', label: 'Material', type: 'text', value: '' },
          { key: 'dimensiuni', label: 'Dimensiuni', type: 'text', value: '' },
          { key: 'restrictii_i', label: 'Restrictii I', type: 'text', value: '' },
          { key: 'vopsit', label: 'Vopsit', type: 'text', value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ] },
        { id: '3', title: 'Banda cantar', fields: [
          { key: 'zincare', label: 'Zincare', type: 'checkbox', value: false },
          { key: 'model', label: 'Model', type: 'text', value: '' },
          { key: 'capacitate', label: 'Capacitate', type: 'text', value: '' },
          { key: 'restrictii_i', label: 'Restrictii I', type: 'text', value: '' },
          { key: 'vopsit', label: 'Vopsit', type: 'text', value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ] },
        { id: '4', title: 'Banda transport (inclinata)', fields: [
          { key: 'zincat', label: 'Zincat', type: 'checkbox', value: false },
          { key: 'vopsit', label: 'Vopsit', type: 'text', value: '' },
          { key: 'latime', label: 'Latime', type: 'text', value: '' },
          { key: 'grosime', label: 'Grosime', type: 'text', value: '' },
          { key: 'motor_kw', label: 'Motor (kW)', type: 'select', options: ['11kW', '15kW', 'Altul'], value: '' },
          { key: 'motor_alt', label: 'Motor — alta valoare', type: 'text', value: '' },
          { key: 'reductor_i', label: 'Reductor i=', type: 'text', value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ] },
        { id: '5', title: 'Malaxor', fields: [
          { key: 'firma', label: 'Firma', type: 'text', value: '' },
          { key: 'tip_malaxor', label: 'Tip', type: 'select', options: ['Dublu ax', 'Planetar'], value: '' },
          { key: 'capacitate', label: 'Capacitate', type: 'text', value: '' },
          { key: 'descarcare', label: 'Descarcare', type: 'select', options: ['C', '3', '6', '9'], value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ] },
        { id: '6', title: 'Turn malaxor (acoperit)', fields: [
          { key: 'model_referinta', label: 'Model referinta', type: 'text', value: '' },
          { key: 'zincat', label: 'Zincat', type: 'checkbox', value: false },
          { key: 'vopsit', label: 'Vopsit', type: 'text', value: '' },
          { key: 'scara_acces', label: 'Scara de acces', type: 'text', value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ] },
        { id: '7', title: 'Turn Nivel 2', fields: [
          { key: 'model_referinta', label: 'Model referinta', type: 'text', value: '' },
          { key: 'zincat', label: 'Zincat', type: 'checkbox', value: false },
          { key: 'vopsit', label: 'Vopsit', type: 'text', value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ] },
        { id: '8', title: 'Cantar Ciment / Apa / Aditivi', fields: [
          { key: 'capacitate_ciment', label: 'Capacitate ciment', type: 'text', value: '' },
          { key: 'capacitate_apa', label: 'Capacitate apa', type: 'text', value: '' },
          { key: 'capacitate_aditivi', label: 'Capacitate aditivi', type: 'text', value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ] },
        { id: '9', title: 'Snecuri', fields: [
          { key: 'diametru', label: 'Diametru', type: 'text', value: '' },
          { key: 'lungime', label: 'Lungime', type: 'text', value: '' },
          { key: 'motor', label: 'Motor', type: 'text', value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ] },
        { id: '10', title: 'Silozuri', fields: [
          { key: 'numar_silozuri', label: 'Numar silozuri', type: 'text', value: '' },
          { key: 'capacitate_t', label: 'Capacitate (t)', type: 'text', value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ] },
      ],
    };

    return JSON.stringify({ tracking, specs });
  }
}
