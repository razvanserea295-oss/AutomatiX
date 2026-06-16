import type { Database } from 'sql.js';





export interface SearchHit {
  type: 'project' | 'client' | 'material' | 'document' | 'station' | 'piece';
  id: number;
  title: string;
  subtitle: string;
  match_field: string;
  score?: number;
  url?: string;
}

export interface SearchGroup {
  type: SearchHit['type'];
  label: string;
  hits: SearchHit[];
}

export interface SearchResult {
  query: string;
  total: number;
  hits: SearchHit[];
  grouped: SearchGroup[];
}

const TYPE_LABELS: Record<SearchHit['type'], string> = {
  project: 'Proiecte', client: 'Clienți', material: 'Materiale',
  document: 'Documente', station: 'Stații', piece: 'Piese',
};

const TYPE_URLS: Record<SearchHit['type'], (id: number) => string> = {
  project:  (id) => `/projects?selected=${id}`,
  client:   (id) => `/clients?selected=${id}`,
  material: (id) => `/materials?selected=${id}`,
  document: (id) => `/documents?selected=${id}`,
  station:  (id) => `/stations/${id}`,
  piece:    (id) => `/parts-tree?piece=${id}`,
};












function fuzzyScore(query: string, target: string): number {
  if (!target) return 0;
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_/\\.]+/g, ' ').trim();
  const q = normalize(query);
  const t = normalize(target);
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 75;
  
  const qTokens = q.split(/\s+/).filter(Boolean);
  const tTokens = t.split(/\s+/).filter(Boolean);
  let matched = 0;
  for (const qt of qTokens) {
    if (tTokens.some(tt => tt.includes(qt) || qt.includes(tt))) matched++;
  }
  if (matched === 0) return 0;
  return Math.round((matched / qTokens.length) * 60);
}

function safeQuery<T>(db: Database, sql: string, params: any[], mapper: (row: any) => T): T[] {
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const out: T[] = [];
    while (stmt.step()) out.push(mapper(stmt.getAsObject()));
    stmt.free();
    return out;
  } catch {
    return [];
  }
}

export class SearchService {
  static search(db: Database, query: string, limitPerType = 10): SearchResult {
    const q = query.trim();
    if (!q) return { query, total: 0, hits: [], grouped: [] };
    const like = `%${q}%`;

    const hits: SearchHit[] = [];

    
    hits.push(...safeQuery(db,
      `SELECT p.id, p.name, p.status, c.name as client_name
       FROM projects p LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.name LIKE ? OR p.description LIKE ?
       ORDER BY p.updated_at DESC LIMIT ?`,
      [like, like, limitPerType],
      (r): SearchHit => ({
        type: 'project',
        id: r.id,
        title: r.name,
        subtitle: `${r.status} · ${r.client_name || '—'}`,
        match_field: 'name/description',
      })
    ));

    
    hits.push(...safeQuery(db,
      `SELECT id, name, contact_person, city FROM clients
       WHERE name LIKE ? OR contact_person LIKE ? OR city LIKE ? OR email LIKE ? OR phone LIKE ?
       ORDER BY name ASC LIMIT ?`,
      [like, like, like, like, like, limitPerType],
      (r): SearchHit => ({
        type: 'client',
        id: r.id,
        title: r.name,
        subtitle: `${r.contact_person || ''}${r.city ? ' · ' + r.city : ''}`,
        match_field: 'name/contact/city',
      })
    ));

    
    hits.push(...safeQuery(db,
      `SELECT id, code, name, category, stock, unit FROM materials
       WHERE name LIKE ? OR code LIKE ? OR category LIKE ?
       ORDER BY name ASC LIMIT ?`,
      [like, like, like, limitPerType],
      (r): SearchHit => ({
        type: 'material',
        id: r.id,
        title: `${r.code} — ${r.name}`,
        subtitle: `${r.category || ''} · ${r.stock} ${r.unit}`,
        match_field: 'code/name/category',
      })
    ));

    
    hits.push(...safeQuery(db,
      `SELECT d.id, d.name, d.file_type, p.name as project_name
       FROM documents d LEFT JOIN projects p ON p.id = d.project_id
       WHERE d.name LIKE ? OR d.original_name LIKE ?
       ORDER BY d.created_at DESC LIMIT ?`,
      [like, like, limitPerType],
      (r): SearchHit => ({
        type: 'document',
        id: r.id,
        title: r.name,
        subtitle: `${r.file_type || ''}${r.project_name ? ' · ' + r.project_name : ''}`,
        match_field: 'name',
      })
    ));

    
    hits.push(...safeQuery(db,
      `SELECT s.id, s.code, s.name, s.location, c.name as client_name
       FROM installed_stations s LEFT JOIN clients c ON c.id = s.client_id
       WHERE s.code LIKE ? OR s.name LIKE ? OR s.location LIKE ?
       ORDER BY s.name ASC LIMIT ?`,
      [like, like, like, limitPerType],
      (r): SearchHit => ({
        type: 'station',
        id: r.id,
        title: `${r.code} — ${r.name}`,
        subtitle: `${r.location || ''}${r.client_name ? ' · ' + r.client_name : ''}`,
        match_field: 'code/name/location',
      })
    ));

    
    
    
    
    
    
    
    
    hits.push(...safeQuery(db,
      `SELECT pp.id, pp.name, pp.category, pp.quantity, pp.source_file_name, pp.supplier_code,
              p.name as project_name
       FROM project_pieces pp LEFT JOIN projects p ON p.id = pp.project_id
       WHERE pp.name LIKE ?
          OR pp.source_file_name LIKE ?
          OR pp.category LIKE ?
          OR pp.assembly_key LIKE ?
          OR pp.supplier_code LIKE ?
       ORDER BY pp.updated_at DESC LIMIT ?`,
      [like, like, like, like, like, limitPerType],
      (r): SearchHit => ({
        type: 'piece',
        id: r.id,
        
        
        title: r.name || r.source_file_name || `Piesă #${r.id}`,
        subtitle: [
          r.category,
          r.quantity ? `× ${r.quantity}` : null,
          r.supplier_code ? `cod ${r.supplier_code}` : null,
          r.source_file_name && r.source_file_name !== r.name ? r.source_file_name : null,
          r.project_name,
        ].filter(Boolean).join(' · '),
        match_field: 'name/file/category/code',
      })
    ));

    
    for (const h of hits) {
      h.score = Math.max(
        fuzzyScore(q, h.title),
        Math.round(fuzzyScore(q, h.subtitle) * 0.7),
      );
      h.url = TYPE_URLS[h.type]?.(h.id);
    }
    hits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    
    const groups = new Map<SearchHit['type'], SearchHit[]>();
    for (const h of hits) {
      if (!groups.has(h.type)) groups.set(h.type, []);
      groups.get(h.type)!.push(h);
    }
    const grouped: SearchGroup[] = Array.from(groups.entries()).map(([type, items]) => ({
      type, label: TYPE_LABELS[type], hits: items,
    }));

    return { query: q, total: hits.length, hits, grouped };
  }
}
