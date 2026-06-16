import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { CommandError } from '../middleware/errors';

export interface PartTreeNode {
  name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category: string;
  db_id: number | null;
  
  supplier_code?: string | null;
  children: PartTreeNode[];
}

const CAD_EXTENSIONS = new Set([
  'sldprt', 'sldasm', 'step', 'stp', 'iges', 'igs',
  'pdf', 'slddrw', 'edrw', 'dwg', 'dxf',
]);

function classifyFileType(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'sldasm': return 'assembly';
    case 'sldprt': return 'part';
    case 'step': case 'stp': case 'iges': case 'igs': return 'cad_exchange';
    case 'pdf': return 'drawing';
    case 'slddrw': case 'edrw': case 'dwg': case 'dxf': return 'technical_drawing';
    default: return 'other';
  }
}

function decodeCategory(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('malaxor') || lower.includes('mixer')) return 'malaxor';
  if (lower.includes('pompa') || lower.includes('pump') || lower.includes('ilc')) return 'pompa';
  if (lower.includes('mot ') || lower.includes('motor') || lower.includes('mot_')) return 'motor';
  if (lower.includes('centralina') || lower.includes('serbatoio') || lower.includes('supap') ||
      lower.includes('valve') || lower.includes('fcv') || lower.includes('gehaeuse')) return 'hidraulica';
  if (lower.includes('skip')) return 'skip';
  if (lower.includes('magnet') || lower.includes('sensor') || lower.includes('apv_')) return 'automatizare';
  if (lower.includes('vasca') || lower.includes('bracci') || lower.includes('carter') ||
      lower.includes('suport') || lower.includes('rama') || lower.includes('scara') ||
      lower.includes('turn') || lower.includes('nivel') || lower.includes('balustrad') ||
      lower.includes('pasarel') || lower.includes('picior')) return 'structura';
  if (lower.includes('siloz') || lower.includes('silo')) return 'siloz';
  if (lower.includes('buncar')) return 'buncar';
  if (lower.includes('cantar')) return 'cantar';
  return 'generic';
}

function displayName(fileName: string): string {
  const stem = path.parse(fileName).name;
  return stem.replace(/_/g, ' ').trim();
}

function scanDirectory(dir: string, base: string, seen: Set<string>): PartTreeNode[] {
  const children: PartTreeNode[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return children;
  }

  const files: { fullPath: string; name: string; size: number }[] = [];
  const subdirs: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      subdirs.push(fullPath);
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        files.push({ fullPath, name: entry.name, size: stat.size });
      } catch {}
    }
  }

  
  subdirs.sort();
  for (const subdir of subdirs) {
    const dirName = path.basename(subdir);
    const subChildren = scanDirectory(subdir, base, seen);
    if (subChildren.length > 0) {
      const relPath = path.relative(base, subdir).replace(/\\/g, '/');
      children.push({
        name: dirName,
        file_name: dirName,
        file_path: relPath,
        file_size: 0,
        file_type: 'assembly',
        category: decodeCategory(dirName),
        db_id: null,
        children: subChildren,
      });
    }
  }

  
  files.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
  for (const file of files) {
    const ext = path.extname(file.name).replace('.', '').toLowerCase();
    if (!CAD_EXTENSIONS.has(ext)) continue;

    
    const absPath = file.fullPath.replace(/\\/g, '/');
    if (seen.has(absPath.toLowerCase())) continue;
    seen.add(absPath.toLowerCase());

    children.push({
      name: displayName(file.name),
      file_name: file.name,
      file_path: absPath,
      file_size: file.size,
      file_type: classifyFileType(ext),
      category: decodeCategory(file.name),
      db_id: null,
      children: [],
    });
  }

  groupPartsUnderAssemblies(children);
  return children;
}

function groupPartsUnderAssemblies(nodes: PartTreeNode[]): void {
  const assemblyStems = nodes
    .map((n, i) => ({ i, stem: path.parse(n.file_name).name.toLowerCase() }))
    .filter((_, idx) => nodes[idx].file_type === 'assembly' && nodes[idx].file_name.toLowerCase().endsWith('.sldasm'));

  if (assemblyStems.length === 0) return;

  const toMove: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.file_type !== 'part' && node.file_type !== 'cad_exchange') continue;
    const partStem = path.parse(node.file_name).name.toLowerCase();

    for (const asm of assemblyStems) {
      if (asm.i !== i && partStem.startsWith(asm.stem) && partStem.length > asm.stem.length) {
        toMove.push([i, asm.i]);
        break;
      }
    }
  }

  
  toMove.sort((a, b) => b[0] - a[0]);
  for (const [partIdx, asmIdx] of toMove) {
    const part = nodes.splice(partIdx, 1)[0];
    const adjusted = partIdx < asmIdx ? asmIdx - 1 : asmIdx;
    nodes[adjusted].children.push(part);
  }
}

export class PartsTreeService {
  static scanFolder(folderPath: string): PartTreeNode[] {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw CommandError.notFound('Folderul specificat nu exista');
    }

    const seen = new Set<string>();
    const children = scanDirectory(folderPath, folderPath, seen);
    const folderName = path.basename(folderPath);

    return [{
      name: folderName,
      file_name: folderName,
      file_path: '',
      file_size: 0,
      file_type: 'assembly',
      category: decodeCategory(folderName),
      db_id: null,
      children,
    }];
  }

  static getProjectTree(db: Database, projectId: number): PartTreeNode[] {
    const stmt = db.prepare(
      `SELECT id, name, category, parent_piece_id, source_file_name, source_file_path, source_file_size, source_file_type, supplier_code
       FROM project_pieces WHERE project_id = ?
       ORDER BY CASE WHEN parent_piece_id IS NULL THEN 0 ELSE 1 END, parent_piece_id, name ASC`
    );
    stmt.bind([projectId]);

    const pieces: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      pieces.push(row);
    }
    stmt.free();

    const byName = (a: any, b: any) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true });

    function buildNode(piece: any): PartTreeNode {
      const kids = pieces
        .filter(p => p.parent_piece_id === piece.id)
        .sort(byName)
        .map(buildNode);
      return {
        name: piece.name || '',
        file_name: piece.source_file_name || '',
        file_path: piece.source_file_path || '',
        file_size: piece.source_file_size || 0,
        file_type: piece.source_file_type || (kids.length ? 'assembly' : 'part'),
        category: piece.category || 'generic',
        db_id: piece.id,
        supplier_code: (piece.supplier_code as string | null) || null,
        children: kids,
      };
    }

    return pieces
      .filter(p => !p.parent_piece_id)
      .sort(byName)
      .map(buildNode);
  }

  

















  static importScanned(db: Database, projectId: number, tree: PartTreeNode[]): void {
    
    
    let stageId: number;
    const stageStmt = db.prepare('SELECT id FROM project_custom_stages WHERE project_id = ? ORDER BY order_index ASC LIMIT 1');
    stageStmt.bind([projectId]);
    if (stageStmt.step()) {
      stageId = stageStmt.get()[0] as number;
    } else {
      db.run("INSERT INTO project_custom_stages (project_id, name, order_index, status) VALUES (?, 'Blueprint Import', 10, 'planificat')", [projectId]);
      const idStmt = db.prepare('SELECT last_insert_rowid()');
      idStmt.step();
      stageId = idStmt.get()[0] as number;
      idStmt.free();
    }
    stageStmt.free();

    
    
    
    
    const normPath = (p: string | null | undefined): string =>
      (p || '').replace(/\\/g, '/').toLowerCase().trim();

    const existingByPath = new Map<string, number>();
    const existsStmt = db.prepare(
      `SELECT id, source_file_path FROM project_pieces
        WHERE project_id = ? AND source_file_name IS NOT NULL`
    );
    existsStmt.bind([projectId]);
    while (existsStmt.step()) {
      const r = existsStmt.getAsObject() as { id: number; source_file_path: string | null };
      const key = normPath(r.source_file_path);
      if (key) existingByPath.set(key, r.id);
    }
    existsStmt.free();

    
    
    const maxStmt = db.prepare('SELECT COALESCE(MAX(sort_order), 0) FROM project_pieces WHERE project_id = ?');
    maxStmt.bind([projectId]);
    maxStmt.step();
    let sortCounter = (maxStmt.get()[0] as number) || 0;
    maxStmt.free();

    const tracking = '{"dxf":"neinceput","desene":"neinceput","executie":"neinceput","livrat":"neinceput","montat":"neinceput","testare":"neinceput","punere_functiune":"neinceput"}';

    
    
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SupplierCodesService } = require('./supplierCodesService');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PiecesOrderingService } = require('./piecesOrderingService');

    function upsertNode(node: PartTreeNode, parentId: number | null): number {
      sortCounter++;
      const supplierCode =
        SupplierCodesService.extract(db, node.name) ||
        SupplierCodesService.extract(db, node.file_name) ||
        null;

      const pathKey = normPath(node.file_path);
      const existingId = pathKey ? existingByPath.get(pathKey) : undefined;

      let pieceId: number;
      if (existingId) {
        
        
        
        
        
        db.run(
          `UPDATE project_pieces SET
              name = ?, category = ?,
              source_file_name = ?, source_file_size = ?, source_file_type = ?,
              supplier_code = ?, parent_piece_id = ?, stage_id = ?,
              updated_at = datetime('now')
           WHERE id = ?`,
          [node.name, node.category, node.file_name, node.file_size, node.file_type,
           supplierCode, parentId, stageId, existingId],
        );
        pieceId = existingId;
      } else {
        db.run(
          `INSERT INTO project_pieces (project_id, stage_id, name, category, quantity, status, parent_piece_id, sort_order, assembly_key, production_tracking, source_file_name, source_file_path, source_file_size, source_file_type, supplier_code)
           VALUES (?, ?, ?, ?, 1, 'planificat', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [projectId, stageId, node.name, node.category, parentId, sortCounter, node.file_name, tracking, node.file_name, node.file_path, node.file_size, node.file_type, supplierCode]
        );
        const idStmt = db.prepare('SELECT last_insert_rowid()');
        idStmt.step();
        pieceId = idStmt.get()[0] as number;
        idStmt.free();
      }

      
      
      
      if (supplierCode) {
        try { PiecesOrderingService.ensureRequested(db, pieceId); }
        catch (e) { console.warn('[partsTree] ensureRequested failed:', e); }
      }

      for (const child of node.children) {
        upsertNode(child, pieceId);
      }
      return pieceId;
    }

    for (const root of tree) {
      upsertNode(root, null);
    }
  }

  













  static wipeScanned(db: Database, projectId: number): { deleted: number } {
    if (!projectId) throw CommandError.badRequest('project_id obligatoriu');

    
    const ids: number[] = [];
    const idStmt = db.prepare(
      'SELECT id FROM project_pieces WHERE project_id = ? AND source_file_name IS NOT NULL',
    );
    idStmt.bind([projectId]);
    while (idStmt.step()) ids.push(idStmt.get()[0] as number);
    idStmt.free();

    if (ids.length === 0) return { deleted: 0 };

    
    
    
    const placeholders = ids.map(() => '?').join(',');
    try {
      db.run(`DELETE FROM piece_order_tracking WHERE piece_id IN (${placeholders})`, ids);
    } catch (e) {
      console.warn('[wipeScanned] piece_order_tracking delete failed:', e instanceof Error ? e.message : e);
    }
    
    
    
    db.run(`DELETE FROM project_pieces WHERE id IN (${placeholders})`, ids);

    return { deleted: ids.length };
  }

  static deleteNode(db: Database, pieceId: number): void {
    function collectIds(parentId: number, ids: number[]): void {
      ids.push(parentId);
      const stmt = db.prepare('SELECT id FROM project_pieces WHERE parent_piece_id = ?');
      stmt.bind([parentId]);
      while (stmt.step()) {
        collectIds(stmt.get()[0] as number, ids);
      }
      stmt.free();
    }

    const ids: number[] = [];
    collectIds(pieceId, ids);
    for (const id of ids) {
      db.run('DELETE FROM project_pieces WHERE id = ?', [id]);
    }
  }
}
