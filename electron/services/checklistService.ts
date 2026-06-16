import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import type { UserWithRole } from './authService';
import { queryOne } from '../db/sqlHelpers';





export interface DesignerChecklist {
  id: number; project_id: number; project_name: string;
  designer_user_id: number; designer_name: string;
  status: string; revision: number;
  tracking_json: string; specs_json: string;
  finalized_at: string | null; created_at: string; updated_at: string;
  

  template_id?: number | null;
  

  template_snapshot_name?: string | null;
  

  column_weights_json?: string | null;
  


  progress_pct?: number;
}

export interface CreateChecklistRequest {
  project_id: number;
  


  template_id?: number;
}

export interface UpdateChecklistRequest {
  id: number; tracking_json?: string | null;
  specs_json?: string | null; status?: string | null;
}





function queryRows<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) results.push(mapper(stmt.getAsObject()));
  stmt.free();
  return results;
}
const SELECT_SQL = `SELECT c.id, c.project_id, p.name as project_name, c.designer_user_id, u.full_name as designer_name,
       c.status, c.revision, c.content_json, c.finalized_at, c.created_at, c.updated_at,
       c.template_id, c.template_snapshot_name, c.column_weights_json
FROM designer_checklists c JOIN projects p ON p.id = c.project_id LEFT JOIN users u ON u.id = c.designer_user_id`;


const FISA_COLUMNS = ['proiect', 'dxf', 'desene', 'executie', 'livrat'] as const;







function weightedProgressPct(trackingJson: string, weightsJson: string | null): number {
  let asms: any[] = [];
  try { const p = JSON.parse(trackingJson); asms = Array.isArray(p) ? p : []; } catch {  }
  if (asms.length === 0) return 0;

  let weights: Record<string, number> | null = null;
  if (weightsJson) {
    try {
      const obj = JSON.parse(weightsJson);
      if (obj && typeof obj === 'object') {
        const w: Record<string, number> = {};
        let sum = 0;
        for (const c of FISA_COLUMNS) { const v = Number(obj[c]); const n = Number.isFinite(v) && v > 0 ? v : 0; w[c] = n; sum += n; }
        if (sum > 0) weights = w;
      }
    } catch {  }
  }
  if (!weights) {
    const per = 100 / FISA_COLUMNS.length;
    weights = FISA_COLUMNS.reduce((a, c) => { a[c] = per; return a; }, {} as Record<string, number>);
  }
  const weightSum = FISA_COLUMNS.reduce((s, c) => s + (weights![c] || 0), 0) || 1;

  const colTotal: Record<string, number> = {}, colDone: Record<string, number> = {};
  for (const c of FISA_COLUMNS) { colTotal[c] = 0; colDone[c] = 0; }
  let total = 0;
  for (const asm of asms) {
    const subs = Array.isArray(asm?.subs) ? asm.subs : [];
    for (const sub of subs) {
      for (const c of FISA_COLUMNS) { colTotal[c] += 1; total += 1; if (sub?.[c]) colDone[c] += 1; }
    }
  }
  if (total === 0) return 0;

  let weighted = 0;
  for (const c of FISA_COLUMNS) { if (colTotal[c] === 0) continue; weighted += (weights[c] || 0) * (colDone[c] / colTotal[c]); }
  return Math.max(0, Math.min(100, Math.round((weighted / weightSum) * 100)));
}

function mapChecklist(row: any): DesignerChecklist {
  const content = row.content_json as string || '{}';
  let tracking = '[]';
  let specs = '{}';
  try {
    const parsed = JSON.parse(content);
    tracking = parsed.tracking ? JSON.stringify(parsed.tracking) : '[]';
    specs = parsed.specs ? JSON.stringify(parsed.specs) : '{}';
  } catch {  }

  return {
    id: row.id as number, project_id: row.project_id as number,
    project_name: row.project_name as string, designer_user_id: row.designer_user_id as number,
    designer_name: (row.designer_name as string) || '', status: row.status as string,
    revision: (row.revision as number) || 0, tracking_json: tracking, specs_json: specs,
    finalized_at: row.finalized_at as string | null,
    created_at: row.created_at as string, updated_at: row.updated_at as string,
    template_id: (row.template_id as number | null) ?? null,
    template_snapshot_name: (row.template_snapshot_name as string | null) ?? null,
    column_weights_json: (row.column_weights_json as string | null) ?? null,
    progress_pct: weightedProgressPct(tracking, (row.column_weights_json as string | null) ?? null),
  };
}





function defaultContent(): string {
  
  const tracking = [
    {
      id: '1', assembly: 'Sasiu statie', zincare: false, culoare: '',
      subs: [
        { id: '1.1', name: 'Sasiu', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
    {
      id: '2', assembly: 'Predozare', zincare: false, culoare: '',
      subs: [
        { id: '2.1', name: 'Structura',  proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '2.2', name: 'Cuve',       proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '2.3', name: 'Obloane',    proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '2.4', name: 'G. desc.',   proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
    {
      id: '3', assembly: 'Banda Cantar', zincare: false, culoare: '',
      subs: [
        { id: '3.1', name: 'Structura', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '3.2', name: 'Pereti',    proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '3.3', name: 'Tamburi',   proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
    {
      id: '4', assembly: 'Banda Transport Material', zincare: false, culoare: '',
      subs: [
        { id: '4.1', name: 'Structura',  proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '4.2', name: 'Tamburi',    proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '4.3', name: 'Cuva prim.', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '4.4', name: 'Picioare',   proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
    {
      id: '5', assembly: 'Malaxor', zincare: false, culoare: '',
      subs: [
        { id: '5.0', name: 'Capac',         proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '5.1', name: 'G. primire',    proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '5.2', name: 'G. descarcare', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '5.3', name: 'Accesorii',     proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '5.4', name: 'M. antistrop',  proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '5.5', name: 'L. Skip',       proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '5.6', name: 'Picioare lin',  proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '5.7', name: 'Tampon lin',    proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
    {
      id: '6', assembly: 'Turn malaxor Nivel 1', zincare: false, culoare: '',
      subs: [
        { id: '6.1', name: 'Picioare', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '6.2', name: 'Cadru',    proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '6.3', name: 'Pasarele', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '6.4', name: 'Scara N1', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
    {
      id: '7', assembly: 'Turn Nivel 2', zincare: false, culoare: '',
      subs: [
        { id: '7.1', name: 'Picioare', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '7.2', name: 'Cadru',    proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '7.3', name: 'Pasarele', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '7.4', name: 'Scara N2', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
    {
      id: '8', assembly: 'Cantare', zincare: false, culoare: '',
      subs: [
        { id: '8.1', name: 'C. apa',     proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '8.2', name: 'C. ciment',  proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '8.3', name: 'C. aditivi', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
    {
      id: '9', assembly: 'Snecuri', zincare: false, culoare: '',
      subs: [
        { id: '9.1', name: 'Snecuri', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
    {
      id: '10', assembly: 'Silozuri', zincare: false, culoare: '',
      subs: [
        { id: '10.1', name: 'Corp Siloz', proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '10.2', name: 'Con Siloz',  proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '10.3', name: 'Capac',      proiect: false, dxf: false, desene: false, executie: false, livrat: false },
        { id: '10.4', name: 'Picioare',   proiect: false, dxf: false, desene: false, executie: false, livrat: false },
      ],
    },
  ];

  
  const specs = {
    header: {
      tip_statie: '', loc: '', beneficiar: '', completat: '',
      ing_proiect: '', data_inceput: '', data_finalizare: '',
    },
    sections: [
      {
        id: '1', title: 'Sasiu statie',
        fields: [
          { key: 'sasiu_da_nu', label: 'Sasiu prevazut', type: 'select', options: ['DA', 'NU'], value: '' },
        ],
      },
      {
        id: '2', title: 'Predozare',
        fields: [
          { key: 'zincare',     label: 'Zincare',     type: 'checkbox', value: false },
          { key: 'material',    label: 'Material',    type: 'text',     value: '' },
          { key: 'dimensiuni',  label: 'Dimensiuni',  type: 'text',     value: '' },
          { key: 'restrictii_i',label: 'Restrictii I',type: 'text',     value: '' },
          { key: 'vopsit',      label: 'Vopsit',      type: 'text',     value: '' },
          { key: 'observatii',  label: 'Observatii',  type: 'textarea', value: '' },
        ],
      },
      {
        id: '3', title: 'Banda cantar',
        fields: [
          { key: 'zincare',     label: 'Zincare',     type: 'checkbox', value: false },
          { key: 'model',       label: 'Model',       type: 'text',     value: '' },
          { key: 'capacitate',  label: 'Capacitate',  type: 'text',     value: '' },
          { key: 'restrictii_i',label: 'Restrictii I',type: 'text',     value: '' },
          { key: 'vopsit',      label: 'Vopsit',      type: 'text',     value: '' },
          { key: 'observatii',  label: 'Observatii',  type: 'textarea', value: '' },
        ],
      },
      {
        id: '4', title: 'Banda transport (inclinata)',
        fields: [
          { key: 'zincat',     label: 'Zincat',     type: 'checkbox', value: false },
          { key: 'vopsit',     label: 'Vopsit',     type: 'text',     value: '' },
          { key: 'latime',     label: 'Latime',     type: 'text',     value: '' },
          { key: 'grosime',    label: 'Grosime',    type: 'text',     value: '' },
          { key: 'motor_kw',   label: 'Motor (kW)', type: 'select',   options: ['11kW', '15kW', 'Altul'], value: '' },
          { key: 'motor_alt',  label: 'Motor — alta valoare', type: 'text', value: '' },
          { key: 'reductor_i', label: 'Reductor i=', type: 'text',     value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ],
      },
      {
        id: '5', title: 'Malaxor',
        fields: [
          { key: 'firma',          label: 'Firma',           type: 'text',     value: '' },
          { key: 'tip_malaxor',    label: 'Tip',             type: 'select',   options: ['Dublu ax', 'Planetar'], value: '' },
          { key: 'capacitate',     label: 'Capacitate',      type: 'text',     value: '' },
          { key: 'descarcare',     label: 'Descarcare (C/3/6/9)', type: 'select', options: ['C', '3', '6', '9'], value: '' },
          { key: 'masca_antistrop',label: 'Masca antistrop', type: 'text',     value: '' },
          { key: 'linie_skip_unghi',label: 'Linie Skip — Unghi', type: 'text', value: '' },
          { key: 'ecartament',     label: 'Ecartament',      type: 'text',     value: '' },
          { key: 'material',       label: 'Material',        type: 'text',     value: '' },
          { key: 'picior_linie',   label: 'Picior linie',    type: 'checkbox', value: false },
          { key: 'tampon_skip',    label: 'Tampon skip',     type: 'checkbox', value: false },
          { key: 'observatii',     label: 'Observatii',      type: 'textarea', value: '' },
        ],
      },
      {
        id: '6', title: 'Turn malaxor (acoperit)',
        fields: [
          { key: 'model_referinta',label: 'Model referinta', type: 'text', value: '' },
          { key: 'zincat',         label: 'Zincat',          type: 'checkbox', value: false },
          { key: 'vopsit',         label: 'Vopsit',          type: 'text', value: '' },
          { key: 'scara_acces',    label: 'Scara de acces',  type: 'text', value: '' },
          { key: 'restrictii',     label: 'Restrictii',      type: 'text', value: '' },
          { key: 'observatii',     label: 'Observatii',      type: 'textarea', value: '' },
        ],
      },
      {
        id: '7', title: 'Turn Nivel 2',
        fields: [
          { key: 'model_referinta',label: 'Model referinta', type: 'text', value: '' },
          { key: 'zincat',         label: 'Zincat',          type: 'checkbox', value: false },
          { key: 'vopsit',         label: 'Vopsit',          type: 'text', value: '' },
          { key: 'scara_acces',    label: 'Scara de acces',  type: 'checkbox', value: false },
          { key: 'observatii',     label: 'Observatii',      type: 'textarea', value: '' },
        ],
      },
      {
        id: '8', title: 'Cantar Ciment / Apa / Aditivi',
        fields: [
          { key: 'capacitate_ciment', label: 'Capacitate ciment', type: 'text', value: '' },
          { key: 'ciment_zincat',     label: 'Ciment — Zincat',   type: 'checkbox', value: false },
          { key: 'ciment_vopsit',     label: 'Ciment — Vopsit',   type: 'text', value: '' },
          { key: 'ciment_forma',      label: 'Ciment — Forma',    type: 'text', value: '' },
          { key: 'capacitate_apa',    label: 'Capacitate apa',    type: 'text', value: '' },
          { key: 'apa_zincat',        label: 'Apa — Zincat',      type: 'checkbox', value: false },
          { key: 'apa_vopsit',        label: 'Apa — Vopsit',      type: 'text', value: '' },
          { key: 'apa_forma',         label: 'Apa — Forma',       type: 'text', value: '' },
          { key: 'capacitate_aditivi',label: 'Capacitate aditivi',type: 'text', value: '' },
        ],
      },
      {
        id: '9', title: 'Snecuri',
        fields: [
          { key: 'nr_buc',     label: 'Nr. bucati',  type: 'text',     value: '' },
          { key: 'lungime',    label: 'Lungime',     type: 'text',     value: '' },
          { key: 'producator', label: 'Producator',  type: 'text',     value: '' },
          { key: 'observatii', label: 'Observatii',  type: 'textarea', value: '' },
        ],
      },
      {
        id: '10', title: 'Silozuri',
        fields: [
          { key: 'nr_buc',          label: 'Nr. bucati',      type: 'text',     value: '' },
          { key: 'capacitate',      label: 'Capacitate',      type: 'text',     value: '' },
          { key: 'vopsit_culoare',  label: 'Vopsit / culoare',type: 'text',     value: '' },
          { key: 'variante_siloz_1',label: 'Varianta siloz 1',type: 'text',     value: '' },
          { key: 'variante_siloz_2',label: 'Varianta siloz 2',type: 'text',     value: '' },
          { key: 'observatii',      label: 'Observatii',      type: 'textarea', value: '' },
        ],
      },
      {
        id: '11', title: 'Documentatie & Restrictii',
        fields: [
          { key: 'documentatie', label: 'Documente cerute (transport, inaltime, stas, etc.)',
            type: 'textarea', value: '' },
        ],
      },
      {
        id: '12', title: 'Plan de amplasare',
        fields: [
          { key: 'amprenta_sol',     label: 'Amprenta la sol',                 type: 'text',     value: '' },
          { key: 'restrictii',       label: 'Restrictii',                      type: 'text',     value: '' },
          { key: 'releveu_beneficiar',label: 'Releveu beneficiar (amprenta topografica)', type: 'textarea', value: '' },
        ],
      },
      {
        id: '13', title: 'Auxiliare',
        fields: [
          { key: 'cabina',     label: 'Cabina',     type: 'text',     value: '' },
          { key: 'compresor',  label: 'Compresor',  type: 'text',     value: '' },
          { key: 'observatii', label: 'Observatii', type: 'textarea', value: '' },
        ],
      },
    ],
    aprobat_beneficiar: {
      semnatura: '', tel: '', email: '',
    },
  };

  return JSON.stringify({ tracking, specs });
}





export class ChecklistService {
  static getAll(db: Database, user: UserWithRole): DesignerChecklist[] {
    const isAdminOrManager = ['admin', 'manager'].includes(user.role_name.toLowerCase());
    const sql = isAdminOrManager
      ? `${SELECT_SQL} ORDER BY c.updated_at DESC`
      : `${SELECT_SQL} WHERE c.designer_user_id = ? ORDER BY c.updated_at DESC`;

    return queryRows(db, sql, isAdminOrManager ? [] : [user.id], mapChecklist);
  }

  static getByProject(db: Database, projectId: number): DesignerChecklist {
    const result = queryOne(db, `${SELECT_SQL} WHERE c.project_id = ?`, [projectId], mapChecklist);
    if (!result) throw CommandError.notFound('Fisa proiectant negasita pentru acest proiect');
    return result;
  }

  static create(db: Database, user: UserWithRole, req: CreateChecklistRequest): DesignerChecklist {
    const exists = queryOne(db,
      'SELECT COUNT(*) as cnt FROM designer_checklists WHERE project_id = ?',
      [req.project_id], r => r.cnt as number);
    if (exists && exists > 0) throw CommandError.conflict('Proiectul are deja o fisa proiectant');

    
    
    
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FisaTemplatesService } = require('./fisaTemplatesService');
    let template;
    if (req.template_id) {
      try { template = FisaTemplatesService.get(db, user, req.template_id); }
      catch { template = FisaTemplatesService.ensureDefaultTemplate(db); }
    } else {
      template = FisaTemplatesService.ensureDefaultTemplate(db);
    }

    
    
    
    
    db.run(
      `INSERT INTO designer_checklists (project_id, designer_user_id, content_json, template_id, template_snapshot_name, column_weights_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.project_id, user.id, template.schema_json, template.id, template.name, template.column_weights_json ?? null],
    );
    return this.getByProject(db, req.project_id);
  }

  static update(db: Database, user: UserWithRole, req: UpdateChecklistRequest): DesignerChecklist {
    const currentContent = queryOne(db,
      'SELECT content_json FROM designer_checklists WHERE id = ?',
      [req.id], r => r.content_json as string);
    if (!currentContent) throw CommandError.notFound('Fisa negasita');

    let parsed: any = {};
    try { parsed = JSON.parse(currentContent); } catch {  }

    if (req.tracking_json) {
      try { parsed.tracking = JSON.parse(req.tracking_json); } catch {  }
    }
    if (req.specs_json) {
      try { parsed.specs = JSON.parse(req.specs_json); } catch {  }
    }

    const finalized = req.status === 'finalized'
      ? new Date().toISOString().replace('T', ' ').substring(0, 19)
      : null;

    db.run(
      `UPDATE designer_checklists SET content_json = ?, status = COALESCE(?, status),
       finalized_at = COALESCE(?, finalized_at), revision = revision + 1,
       updated_at = datetime('now') WHERE id = ?`,
      [JSON.stringify(parsed), req.status ?? null, finalized, req.id]
    );

    const pid = queryOne(db, 'SELECT project_id FROM designer_checklists WHERE id = ?', [req.id], r => r.project_id as number);
    if (!pid) throw CommandError.notFound('Fisa negasita');

    
    
    
    
    
    
    
    
    
    if (req.status === 'finalized') {
      const currentStage = queryOne(db,
        'SELECT stage_id FROM projects WHERE id = ?',
        [pid], r => r.stage_id as number | null
      );
      if (currentStage === 1 || currentStage === 2) {
        
        
        db.run(
          "UPDATE projects SET stage_id = 3, status = 'în producție', updated_at = datetime('now') WHERE id = ?",
          [pid]
        );
        
        try {
          
          const { HandoffService } = require('./handoffService');
          HandoffService.create(db, {
            project_id: pid,
            from_stage_id: currentStage,
            to_stage_id: 3,
            from_user_id: user.id,
            to_role: 'hala',
            handoff_notes: 'Fișa proiectant finalizată — proiect transferat în producție.',
          });
        } catch (e) {
          console.error('[checklistService] handoff create failed:', e);
        }
      }
    }

    return this.getByProject(db, pid);
  }
}
