

































































import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { ChevronRight, Search, FolderTree, FileBox, Upload, FolderUp, Loader2, ChevronsUpDown, Plus, Wand2, Tags, Download, Boxes, X, Trash2 } from 'lucide-react';
import SupplierCodesModal from '@/pages/parts-tree/SupplierCodesModal';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/core/types';
import { apiCommand, ElectronEnvironment } from '@/api/commands';
import { getServerUrl } from '@/config/server';
import { STORAGE_KEYS, getStorage } from '@/config/localStorage';
import { useProjectStore } from '@/store/projectStore';
import { usePieceStore, usePiecesForProject } from '@/store/pieceStore';
import type { PartTreeNode } from '@/pages/parts-tree/types';
import { catColor, formatSize, countTotal } from '@/pages/parts-tree/types';
import type { ProjectPiece } from '@/types/piece';
import PieceDetailView from '@/components/PieceDetailView';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import PartsTreeEnhancements from '@/pages/parts-tree/PartsTreeEnhancements';


import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import HeroHeader from '@/redesign/ui/HeroHeader';
import EmptyState from '@/redesign/ui/EmptyState';
import {
  filterSearchInputCls,
  filterSearchIconCls,
  filterSelectCls,
  filterToggleCls,
} from '@/redesign/ui/filterControls';

interface Stage { id: number; name: string; }

const PIECE_CATEGORIES = [
  { value: 'mixer', label: 'Mixer' },
  { value: 'siloz', label: 'Siloz' },
  { value: 'transportor', label: 'Transportor' },
  { value: 'buncar', label: 'Buncar' },
  { value: 'structura', label: 'Structura' },
  { value: 'automatizare', label: 'Automatizare' },
  { value: 'altele', label: 'Altele' },
];





type NodeRole = 'root' | 'semi' | 'branch' | 'branchLeaf' | 'leaf';

const ROLE_COLORS: Record<NodeRole, string> = {
  root: '#F0C420',
  semi: '#22C55E',
  branch: '#F97316',
  branchLeaf: '#38BDF8',
  leaf: '#6B7280',
};

const LEGEND: { role: NodeRole; label: string }[] = [
  { role: 'root', label: 'Principal' },
  { role: 'semi', label: 'Semi-principal' },
  { role: 'branch', label: 'Sub + ramuri' },
  { role: 'branchLeaf', label: 'Sub + frunze' },
  { role: 'leaf', label: 'Cap de linie' },
];

function getRole(node: PartTreeNode, depth: number): NodeRole {
  if (depth === 0) return 'root';
  if (depth === 1 && node.children.length > 0) return 'semi';
  if (node.children.length === 0) return 'leaf';
  if (node.children.every(c => c.children.length === 0)) return 'branchLeaf';
  return 'branch';
}






















const UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024; 

async function uploadFileChunked(opts: {
  serverUrl: string;
  token: string;
  projectId: number;
  relPath: string;
  file: File;
  onProgress?: (bytesDone: number) => void;
}): Promise<string> {
  const { serverUrl, token, projectId, relPath, file, onProgress } = opts;
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_SIZE));
  
  const sessionBytes = new Uint8Array(16);
  crypto.getRandomValues(sessionBytes);
  const session = Array.from(sessionBytes, b => b.toString(16).padStart(2, '0')).join('');

  
  
  const relB64 = btoa(unescape(encodeURIComponent(relPath)));

  let serverPath = '';
  for (let i = 0; i < totalChunks; i++) {
    const start = i * UPLOAD_CHUNK_SIZE;
    const end = Math.min(file.size, start + UPLOAD_CHUNK_SIZE);
    const chunk = file.slice(start, end);
    const url = `${serverUrl}/api/parts-tree/${projectId}/upload-chunk?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'X-Upload-Session': session,
        'X-Chunk-Index':    String(i),
        'X-Chunk-Total':    String(totalChunks),
        'X-Rel-Path-B64':   relB64,
        'X-File-Size':      String(file.size),
      },
      body: chunk,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Upload chunk ${i + 1}/${totalChunks} failed: ${res.status} ${detail.slice(0, 200)}`);
    }
    if (onProgress) onProgress(end);
    if (i === totalChunks - 1) {
      const json = await res.json().catch(() => ({})) as { server_path?: string };
      serverPath = json.server_path || '';
    }
  }
  if (!serverPath) throw new Error('Serverul nu a returnat path-ul final');
  return serverPath;
}





















function pruneToAssemblies(nodes: PartTreeNode[]): PartTreeNode[] {
  const out: PartTreeNode[] = [];
  for (const node of nodes) {
    const filteredChildren = pruneToAssemblies(node.children);
    const isAssembly = node.file_type === 'assembly';
    
    
    if (!isAssembly && filteredChildren.length === 0) continue;
    out.push({ ...node, children: filteredChildren });
  }
  return out;
}





interface TreeRow {
  id: string;
  node: PartTreeNode;
  depth: number;
  role: NodeRole;
  hasChildren: boolean;
  isLastChild: boolean;
  parentIsLast: boolean[];  
}

function flattenTree(
  nodes: PartTreeNode[],
  collapsed: Set<string>,
  depth = 0,
  prefix = 'r',
  parentIsLast: boolean[] = [],
): TreeRow[] {
  const rows: TreeRow[] = [];
  nodes.forEach((node, i) => {
    const id = `${prefix}-${i}`;
    const isLast = i === nodes.length - 1;
    const role = getRole(node, depth);
    const hasChildren = node.children.length > 0;

    rows.push({ id, node, depth, role, hasChildren, isLastChild: isLast, parentIsLast: [...parentIsLast] });

    if (hasChildren && !collapsed.has(id)) {
      rows.push(...flattenTree(node.children, collapsed, depth + 1, id, [...parentIsLast, isLast]));
    }
  });
  return rows;
}





const ROW_H = 30;
const INDENT = 22;
const CIRCLE_R = 5;





interface RowData {
  rows: TreeRow[];
  selectedId: string | null;
  collapsed: Set<string>;
  searchQuery: string;
  
  
  
  animKey: number;
  onRowClick: (row: TreeRow) => void;
  onToggleCollapse: (id: string) => void;
}


function TreeRowItemBase({
  index, style,
  rows, selectedId, collapsed, searchQuery, animKey, onRowClick, onToggleCollapse,
}: RowComponentProps<RowData>) {
  const row = rows[index];
  const color: string = ROLE_COLORS[row.role as NodeRole];
  const isSelected = selectedId === row.id;
  const isCollapsed = collapsed.has(row.id);
  const indent = row.depth * INDENT + 12;
  
  
  
  

  const nameEl = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return row.node.name;
    const idx = row.node.name.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return row.node.name;
    return (
      <>{row.node.name.slice(0, idx)}<mark className="bg-accent/30 text-inherit px-0.5">{row.node.name.slice(idx, idx + q.length)}</mark>{row.node.name.slice(idx + q.length)}</>
    );
  }, [row.node.name, searchQuery]);

  
  
  const enterDelay = index < 12 ? Math.min(index * 28, 315) : 0;
  return (
    <div
      key={`${animKey}-${row.id}`}
      style={{ ...style, paddingLeft: indent, animationDelay: `${enterDelay}ms` }}
      className={`flex items-center cursor-pointer transition-colors enter-fade ${isSelected ? 'bg-accent/10' : 'hover:bg-surface-tertiary/50'}`}
      onClick={() => onRowClick(row)}
    >
      <div className="relative flex items-center" style={{ width: INDENT }}>
        {row.depth > 0 && (
          <div className="absolute bg-line" style={{
            width: 1, left: -INDENT / 2,
            top: row.isLastChild ? -ROW_H / 2 : -ROW_H,
            height: row.isLastChild ? ROW_H / 2 : ROW_H,
          }} />
        )}
        {row.depth > 0 && (
          <div className="absolute bg-line" style={{ height: 1, left: -INDENT / 2, width: INDENT / 2, top: 0 }} />
        )}
        {row.parentIsLast.map((isLast: boolean, d: number) => (
          !isLast && d > 0 ? (
            <div key={d} className="absolute bg-line" style={{
              width: 1, left: -(row.depth - d) * INDENT - INDENT / 2,
              top: -ROW_H, height: ROW_H * 2,
            }} />
          ) : null
        ))}
      </div>

      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {row.hasChildren ? (
          <button
            onClick={e => { e.stopPropagation(); onToggleCollapse(row.id); }}
            className="h-4 w-4 flex items-center justify-center rounded transition-smooth duration-150 hover:bg-surface-tertiary active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <ChevronRight
              className={`h-3 w-3 text-content-muted transition-transform duration-200 motion-reduce:transition-none ${isCollapsed ? '' : 'rotate-90'}`}
            />
          </button>
        ) : <span className="w-4" />}
      </div>

      <span className="shrink-0 mr-2" style={{
        width: CIRCLE_R * 2 + (row.role === 'root' ? 4 : 0),
        height: CIRCLE_R * 2 + (row.role === 'root' ? 4 : 0),
        backgroundColor: color,
        border: isSelected ? '2px solid var(--color-text-primary)' : 'none',
      }} />

      <span className={`text-pm-xs truncate flex-1 min-w-0 ${isSelected ? 'text-content-primary font-semibold' : 'text-content-primary font-medium'}`}>
        {nameEl}
      </span>

      {}
      {row.node.supplier_code && (
        <span
          className="ml-1 text-pm-2xs px-1.5 py-0.5 rounded-md font-mono font-bold text-white bg-status-amber shrink-0"
          title={`Cod furnizor: ${row.node.supplier_code} — vezi pagina "De comandat"`}
        >
          {row.node.supplier_code}
        </span>
      )}

      {row.hasChildren && isCollapsed && (
        <span className="ml-1 text-pm-2xs text-content-muted bg-surface-tertiary px-1.5 py-0.5 rounded-md">+{row.node.children.length}</span>
      )}
      <span className="ml-2 text-pm-2xs text-content-muted capitalize">{row.node.category}</span>
      {row.node.file_type && <span className="ml-1 text-pm-2xs text-content-muted opacity-60">{row.node.file_type}</span>}
      {row.node.file_size > 0 && <span className="ml-1 text-pm-2xs text-content-muted font-mono tabular-nums">{formatSize(row.node.file_size)}</span>}
      <div className="w-3" />
    </div>
  );
}



const TreeRowItem = TreeRowItemBase;





interface PartsTreePageProps { user: User; initialProjectId?: number | null; }

export default function PartsTreePage({ initialProjectId }: PartsTreePageProps) {
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const [selectedProject, setSelectedProject] = useState<number | null>(initialProjectId ?? null);
  const [treeData, setTreeData] = useState<PartTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewingPiece, setViewingPiece] = useState<ProjectPiece | null>(null);
  const [viewingBreadcrumb, setViewingBreadcrumb] = useState<string[]>([]);
  const [codesModalOpen, setCodesModalOpen] = useState(false);
  
  
  
  
  const [assemblyOnly, setAssemblyOnly] = useState<boolean>(() => {
    try { return localStorage.getItem('promix_tree_assembly_only') === '1'; }
    catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('promix_tree_assembly_only', assemblyOnly ? '1' : '0'); } catch {  }
  }, [assemblyOnly]);
  const currentUser = useAuthStore(s => s.user);
  const isAdmin = currentUser?.role_name === 'admin';
  const pieces = usePiecesForProject(selectedProject);
  const fetchPiecesStore = usePieceStore(s => s.fetchPieces);
  const updatePieceStore = usePieceStore(s => s.updatePiece);
  const createPieceStore = usePieceStore(s => s.createPiece);
  const [stages, setStages] = useState<Stage[]>([]);
  const { isOpen: addOpen, openModal: openAddModal, closeModal: closeAddModal } = useFormModal();

  
  
  
  
  
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
    bytesDone: number;
    bytesTotal: number;
    startedAt: number;
  } | null>(null);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  
  useEffect(() => {
    if (!selectedProject) { setStages([]); return; }
    apiCommand<Stage[]>('get_project_stages_custom', { project_id: selectedProject })
      .then(setStages).catch(() => setStages([]));
  }, [selectedProject]);

  
  
  useEffect(() => {
    if (!selectedProject) return;
    fetchPiecesStore(selectedProject).then((ps) => {
      const focusId = sessionStorage.getItem('promix_focus_piece');
      if (focusId) {
        sessionStorage.removeItem('promix_focus_piece');
        const target = ps.find(p => p.id === Number(focusId));
        if (target) {
          setViewingPiece(target);
          setViewingBreadcrumb([target.name]);
        }
      }
    });
  }, [selectedProject, fetchPiecesStore]);

  const loadTree = useCallback(() => {
    if (!selectedProject) { setTreeData([]); setLoading(false); return; }
    setLoading(true);
    apiCommand<PartTreeNode[] | { tree?: PartTreeNode[] }>('get_project_parts_tree', { project_id: selectedProject })
      .then(r => {
        const data = Array.isArray(r) ? r : Array.isArray((r as { tree?: PartTreeNode[] }).tree) ? (r as { tree?: PartTreeNode[] }).tree! : [];
        setTreeData(data);
        
        if (countTotal(data) > 50) {
          const ids = new Set<string>();
          const collect = (nodes: PartTreeNode[], pfx: string, d: number) => {
            nodes.forEach((n, i) => {
              const nid = `${pfx}-${i}`;
              if (d >= 2 && n.children.length > 0) ids.add(nid);
              if (n.children.length > 0) collect(n.children, nid, d + 1);
            });
          };
          data.forEach((root, ri) => collect(root.children, `r-${ri}`, 1));
          setCollapsed(ids);
        }
      })
      .catch(() => setTreeData([]))
      .finally(() => setLoading(false));
  }, [selectedProject]);
  useEffect(loadTree, [loadTree]);

  
  
  
  
  useEffect(() => {
    if (selectedProject) loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces.length, pieces.map(p => `${p.id}:${p.stage_id}:${p.status}:${p.sort_order}:${p.name}`).join('|')]);

  const totalParts = useMemo(() => countTotal(treeData), [treeData]);

  
  
  
  
  const visibleTree = useMemo(
    () => assemblyOnly ? pruneToAssemblies(treeData) : treeData,
    [treeData, assemblyOnly],
  );
  const visibleTotal = useMemo(() => countTotal(visibleTree), [visibleTree]);

  const rows = useMemo(() => flattenTree(visibleTree, collapsed), [visibleTree, collapsed]);

  
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 120);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearch.trim()) return rows;
    const q = debouncedSearch.toLowerCase();
    return rows.filter(r => r.node.name.toLowerCase().includes(q) || r.node.file_name.toLowerCase().includes(q));
  }, [rows, debouncedSearch]);

  

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const collapseAll = useCallback(() => {
    const ids = new Set<string>();
    const collect = (nodes: PartTreeNode[], pfx: string) => {
      nodes.forEach((n, i) => { const id = `${pfx}-${i}`; if (n.children.length > 0) { ids.add(id); collect(n.children, id); } });
    };
    
    
    
    visibleTree.forEach((r, ri) => collect(r.children, `r-${ri}`));
    setCollapsed(ids);
  }, [visibleTree]);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return rows.find(r => r.id === selectedId)?.node || null;
  }, [selectedId, rows]);

  const reloadPieces = useCallback(() => {
    if (!selectedProject) return;
    void fetchPiecesStore(selectedProject, true);
  }, [selectedProject, fetchPiecesStore]);

  
  const doImport = useCallback(async (tree: PartTreeNode[]) => {
    if (!selectedProject || tree.length === 0) return;
    setImporting(true); setStatus(null);
    try {
      await apiCommand('import_scanned_parts', { project_id: selectedProject, tree });
      loadTree();
      reloadPieces();
      setStatus({ type: 'ok', msg: `${countTotal(tree)} piese importate cu succes` });
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setStatus({ type: 'err', msg: err instanceof Error ? err.message : 'Eroare la import' });
    } finally { setImporting(false); }
  }, [selectedProject, loadTree, reloadPieces]);

  









  const handleDownloadZip = useCallback(() => {
    if (!selectedProject) return;
    const base = getServerUrl();
    if (!base) {
      toast.error('Conexiunea la server nu este configurată');
      return;
    }
    const token = getStorage(STORAGE_KEYS.TOKEN);
    if (!token) {
      toast.error('Sesiune expirată — reloghează-te');
      return;
    }
    const url = `${base}/api/parts-tree/${selectedProject}/download.zip?token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = url;
    
    
    
    a.download = '';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Descărcare pornită');
  }, [selectedProject]);

  const handlePickFolder = useCallback(async () => {
    if (!selectedProject) return;
    if (ElectronEnvironment.isElectron()) {
      try {
        const selected = await window.electron.invoke('dialog_open_directory', { title: 'Selectează folder cu piese' }) as string | null;
        if (selected && typeof selected === 'string') {
          setImporting(true); setStatus(null);
          try {
            const scanned = await apiCommand<PartTreeNode[]>('scan_parts_folder', { folder_path: selected });
            if (scanned?.length) await doImport(scanned);
            else setStatus({ type: 'err', msg: 'Niciun fisier CAD gasit' });
          } catch (err) { setStatus({ type: 'err', msg: err instanceof Error ? err.message : 'Eroare' }); }
          finally { setImporting(false); }
        }
      } catch { setShowFolderInput(true); }
    } else {
      
      
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      } else {
        setShowFolderInput(true);
      }
    }
  }, [selectedProject, doImport]);

  







  










  const buildTreeFromFiles = useCallback((files: FileList, pathMap?: Map<string, string>): PartTreeNode[] => {
    type Mut = Omit<PartTreeNode, 'children'> & { childrenMap: Map<string, Mut> };
    const root = new Map<string, Mut>();

    for (const f of Array.from(files)) {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      const parts = rel.split('/');
      let current = root;

      
      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        let node = current.get(dirName);
        if (!node) {
          node = {
            name: dirName, file_name: '', file_path: parts.slice(0, i + 1).join('/'),
            file_size: 0, file_type: '', category: 'folder',
            childrenMap: new Map(),
          };
          current.set(dirName, node);
        }
        current = node.childrenMap;
      }

      
      
      
      const fileName = parts[parts.length - 1];
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const serverPath = pathMap?.get(rel);
      current.set(fileName, {
        name: fileName.replace(/\.[^.]+$/, ''),
        file_name: fileName,
        file_path: serverPath || rel,
        file_size: f.size,
        file_type: ext,
        category: 'generic',
        childrenMap: new Map(),
      });
    }

    const toArray = (map: Map<string, Mut>): PartTreeNode[] =>
      Array.from(map.values()).map(n => ({
        name: n.name, file_name: n.file_name, file_path: n.file_path,
        file_size: n.file_size, file_type: n.file_type, category: n.category,
        children: toArray(n.childrenMap),
      }));

    return toArray(root);
  }, []);

  


















  const handleBrowserFolderPicked = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProject) return;
    const all = e.target.files;
    if (!all || all.length === 0) return;

    
    
    
    
    const SKIP_NAMES = /^(thumbs\.db|desktop\.ini|\.ds_store|ehthumbs\.db)$/i;
    const files: File[] = [];
    for (const f of Array.from(all)) {
      if (SKIP_NAMES.test(f.name)) continue;
      files.push(f);
    }
    if (files.length === 0) {
      setStatus({ type: 'err', msg: 'Niciun fișier valid în selecție' });
      e.target.value = '';
      return;
    }

    const base = getServerUrl();
    const token = getStorage(STORAGE_KEYS.TOKEN);
    if (!base || !token) {
      setStatus({ type: 'err', msg: 'Sesiunea sau URL-ul serverului lipsesc — reloghează-te' });
      e.target.value = '';
      return;
    }

    setImporting(true); setStatus(null);
    const totalBytes = files.reduce((s, f) => s + f.size, 0);
    setUploadProgress({
      current: 0, total: files.length, fileName: files[0].name,
      bytesDone: 0, bytesTotal: totalBytes, startedAt: Date.now(),
    });

    
    
    
    const pathMap = new Map<string, string>();
    let bytesDoneAcrossFiles = 0;

    try {
      for (let idx = 0; idx < files.length; idx++) {
        const f = files[idx];
        const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
        setUploadProgress(p => p ? { ...p, current: idx, fileName: f.name } : p);

        const serverPath = await uploadFileChunked({
          serverUrl: base,
          token,
          projectId: selectedProject,
          relPath: rel,
          file: f,
          onProgress: (perFileDone) => {
            setUploadProgress(p => p ? { ...p, bytesDone: bytesDoneAcrossFiles + perFileDone } : p);
          },
        });
        pathMap.set(rel, serverPath);
        bytesDoneAcrossFiles += f.size;
        setUploadProgress(p => p ? { ...p, bytesDone: bytesDoneAcrossFiles } : p);
      }

      
      
      
      const tree = buildTreeFromFiles(all, pathMap);
      if (tree.length === 0) {
        setStatus({ type: 'err', msg: 'Niciun fișier găsit în selecție' });
        return;
      }
      await doImport(tree);
      setStatus({ type: 'ok', msg: `Încărcate ${files.length} fișiere (${formatSize(totalBytes)})` });
    } catch (err) {
      setStatus({ type: 'err', msg: err instanceof Error ? err.message : 'Eroare la import' });
    } finally {
      setImporting(false);
      setUploadProgress(null);
      e.target.value = ''; 
    }
  }, [selectedProject, buildTreeFromFiles, doImport]);

  const handleScanFolder = useCallback(async () => {
    if (!selectedProject || !folderPath.trim()) return;
    setImporting(true); setStatus(null);
    try {
      const scanned = await apiCommand<PartTreeNode[]>('scan_parts_folder', { folder_path: folderPath.trim().replace(/^["']+|["']+$/g, '') });
      if (scanned?.length) await doImport(scanned);
      else setStatus({ type: 'err', msg: 'Niciun fisier gasit' });
      setShowFolderInput(false); setFolderPath('');
    } catch (err) { setStatus({ type: 'err', msg: err instanceof Error ? err.message : 'Eroare' }); }
    finally { setImporting(false); }
  }, [selectedProject, folderPath, doImport]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const tree: PartTreeNode[] = Array.from(files).map(f => ({
      name: f.name.replace(/\.[^.]+$/, ''), file_name: f.name,
      file_path: (f as File & { path?: string }).path || f.name, file_size: f.size,
      file_type: f.name.split('.').pop()?.toLowerCase() || '', category: 'generic', children: [],
    }));
    void doImport(tree);
  }, [selectedProject, doImport]);

  const [sorting, setSorting] = useState(false);

  
  const CATEGORY_PRIORITY = ['structura', 'buncar', 'siloz', 'mixer', 'transportor', 'automatizare', 'altele'];
  const catRank = (c: string): number => {
    const idx = CATEGORY_PRIORITY.indexOf((c || '').toLowerCase());
    return idx === -1 ? CATEGORY_PRIORITY.length : idx;
  };
  const naturalCompare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

  const ruleBasedOrder = useCallback((list: ProjectPiece[]): number[] => {
    return [...list]
      .sort((a, b) => {
        if (a.stage_id !== b.stage_id) return a.stage_id - b.stage_id;
        const ca = catRank(a.category), cb = catRank(b.category);
        if (ca !== cb) return ca - cb;
        const ka = a.assembly_key || '', kb = b.assembly_key || '';
        if (ka !== kb) return naturalCompare(ka, kb);
        return naturalCompare(a.name, b.name);
      })
      .map(p => p.id);
  }, []);

  
  
  
  const cleanupName = (raw: string): string => {
    let s = (raw || '').trim();
    s = s.replace(/\.(sldprt|sldasm|step|stp|iges|igs|dxf|dwg|stl|obj|prt|par)$/i, '');
    s = s.replace(/^\d+[\s_\-.]+/, '');    
    s = s.replace(/[_\-]+/g, ' ');          
    s = s.replace(/\s+/g, ' ').trim();
    
    s = s.replace(/\b\w/g, ch => ch.toUpperCase());
    return s || raw;
  };

  
  
  
  const persistOrder = useCallback(async (
    orderedIds: number[],
    renames?: Record<number, string>,
  ) => {
    let order = 1;
    for (const id of orderedIds) {
      const patch: Record<string, unknown> = { sort_order: order++ };
      if (renames && renames[id]) {
        const piece = pieces.find(p => p.id === id);
        patch.name = renames[id];
        if (piece && !piece.original_name) patch.original_name = piece.name;
      }
      if (selectedProject) await updatePieceStore(id, selectedProject, patch);
    }
    loadTree();
  }, [loadTree, selectedProject, pieces, updatePieceStore]);

  const requestSort = useCallback(async () => {
    if (!selectedProject || pieces.length === 0) return;
    setSorting(true); setStatus(null);
    try {
      const ordered = ruleBasedOrder(pieces);
      const renames: Record<number, string> = {};
      for (const p of pieces) {
        const cleaned = cleanupName(p.name);
        if (cleaned !== p.name) renames[p.id] = cleaned;
      }
      await persistOrder(ordered, renames);
      setStatus({ type: 'ok', msg: `${ordered.length} piese sortate + redenumite` });
      setTimeout(() => setStatus(null), 4000);
    } catch (err2) {
      setStatus({ type: 'err', msg: err2 instanceof Error ? err2.message : 'Eroare la sortare' });
    } finally {
      setSorting(false);
    }
  }, [selectedProject, pieces, ruleBasedOrder, persistOrder]);

  















  const handleWipeTree = useCallback(async () => {
    if (!selectedProject) return;
    const proj = projects.find(p => p.id === selectedProject);
    const projName = proj?.name || 'acest proiect';
    const ok = await confirmDialog({
      title: `ȘTERGI întreg arborele de piese din "${projName}"?`,
      body:
        `• Cele ${totalParts} piese importate dispar din arbore.\n` +
        `• Piesele adăugate manual (fără fișier) RĂMÂN.\n` +
        `• Fișierele uploadate pe server NU se șterg fizic — doar referințele din DB.\n` +
        `• Poți re-importă folderul după.`,
      hint: 'Această acțiune nu poate fi anulată. Continui?',
      danger: true,
      confirmLabel: 'Șterge arbore',
    });
    if (!ok) return;
    try {
      const res = await apiCommand<{ deleted: number }>('wipe_project_parts_tree', { project_id: selectedProject });
      toast.success(`${res.deleted} piese șterse din arbore`);
      loadTree();
    } catch (e: any) {
      toast.error(e?.message || 'Ștergere eșuată');
    }
  }, [selectedProject, projects, totalParts, loadTree]);

  
  const handleRowClick = useCallback((row: TreeRow) => {
    setSelectedId(row.id);
    const match = pieces.find(p => p.name === row.node.name || p.source_file_name === row.node.file_name);
    if (match) {
      const bc: string[] = [];
      const parts = row.id.split('-');
      let current = treeData;
      for (let k = 1; k < parts.length; k++) {
        const idx = parseInt(parts[k]);
        if (current[idx]) { bc.push(current[idx].name); current = current[idx].children; }
      }
      const proj = projects.find(p => p.id === selectedProject);
      setViewingBreadcrumb([proj?.name || 'Proiect', ...bc]);
      setViewingPiece(match);
    }
  }, [pieces, treeData, projects, selectedProject]);

  
  
  
  
  const treeAnimKey = useMemo(
    () => `${debouncedSearch}|${assemblyOnly ? 1 : 0}|${selectedProject ?? 0}|${visibleTotal}`,
    [debouncedSearch, assemblyOnly, selectedProject, visibleTotal],
  );
  const animKeyNum = useMemo(() => {
    let h = 0;
    for (let i = 0; i < treeAnimKey.length; i++) h = (h * 31 + treeAnimKey.charCodeAt(i)) | 0;
    return h;
  }, [treeAnimKey]);

  
  const rowData = useMemo<RowData>(() => ({
    rows: filteredRows,
    selectedId,
    collapsed,
    searchQuery: debouncedSearch,
    animKey: animKeyNum,
    onRowClick: handleRowClick,
    onToggleCollapse: toggleCollapse,
  }), [filteredRows, selectedId, collapsed, debouncedSearch, animKeyNum, handleRowClick, toggleCollapse]);

  
  if (viewingPiece) {
    return (
      <PieceDetailView
        piece={viewingPiece}
        breadcrumb={viewingBreadcrumb}
        onBack={() => { setViewingPiece(null); loadTree(); }}
        onUpdate={() => {
          
          loadTree();
        }}
      />
    );
  }

  return (
    <Page fit>
      <Page.Body fit maxWidth="full" padding="comfortable">

        {}
        <HeroHeader
          className="enter-up"
          style={{ animationDelay: '0ms' }}
          eyebrow="Proiectare"
          icon={FolderTree}
          title="Arbore piese"
          subtitle="Structura CAD a proiectului — ansambluri, subansambluri și componente"
          actions={
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <select
                value={selectedProject ?? ''}
                onChange={e => setSelectedProject(Number(e.target.value) || null)}
                className={filterSelectCls(selectedProject != null)}
              >
                <option value="">Selectează proiect...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.client_name}</option>)}
              </select>
              <Button variant="outline" size="md" onClick={() => setCodesModalOpen(true)} title="Coduri furnizor — legenda">
                <Tags className="h-3.5 w-3.5" /> Coduri
              </Button>
              {selectedProject && (
                <Button size="md" onClick={() => openAddModal()} disabled={stages.length === 0}>
                  <Plus className="h-3.5 w-3.5" /> Adaugă piesa
                </Button>
              )}
            </div>
          }
        />

        {
}
        <Card padding="md" tone="elevated" className="shrink-0 enter-up" style={{ animationDelay: '120ms' }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative group">
              <Search className={filterSearchIconCls} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Caută piesa..."
                className={filterSearchInputCls}
              />
            </div>

            <button onClick={collapsed.size > 0 ? expandAll : collapseAll} className={filterToggleCls(false)}>
              <ChevronsUpDown className="h-3.5 w-3.5" /> {collapsed.size > 0 ? 'Expandeaza' : 'Restringe'}
            </button>

            {

}
            <button
              onClick={() => setAssemblyOnly(v => !v)}
              title={assemblyOnly
                ? 'Acum vezi doar ansambluri (.SLDASM). Click pentru tot arborele.'
                : 'Ascunde piesele individuale (.SLDPRT) — vezi doar ansamblurile.'}
              className={filterToggleCls(assemblyOnly)}
            >
              <Boxes className="h-3.5 w-3.5" /> {assemblyOnly ? 'Doar ansambluri' : 'Toate fișierele'}
            </button>

            <div className="flex-1" />

            <div className="flex flex-wrap items-center gap-2 justify-end">
              {selectedProject && (
                <>
                  <Button variant="outline" size="sm" onClick={handlePickFolder} disabled={importing}>
                    <FolderUp className="h-3.5 w-3.5" /> Import
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadZip}
                    disabled={totalParts === 0 || importing}
                    title="Descarcă arborele întreg ca ZIP — util pentru predarea proiectului la alt proiectant"
                  >
                    <Download className="h-3.5 w-3.5" /> ZIP
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestSort}
                    disabled={sorting || pieces.length === 0}
                    title="Sortează și redenumește piesele după reguli"
                  >
                    {sorting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    Sortează
                  </Button>
                  {totalParts > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWipeTree}
                      disabled={importing}
                      title="Șterge toate piesele importate din arbore. Confirmare cerută înainte. Piesele adăugate manual rămân."
                      className="border-status-red/40 text-status-red hover:bg-status-red/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Șterge arbore
                    </Button>
                  )}
                  {


}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    // @ts-expect-error: webkitdirectory is non-standard but works in Chrome/Edge/Firefox
                    webkitdirectory=""
                    directory=""
                    className="hidden"
                    onChange={handleBrowserFolderPicked}
                  />
                </>
              )}
              <span className="text-pm-2xs text-content-muted tabular-nums pl-1" title={
                assemblyOnly
                  ? `${filteredRows.length} vizibile · ${visibleTotal} ansambluri din ${totalParts} total`
                  : `${filteredRows.length} vizibile din ${totalParts} total`
              }>
                {importing
                  ? 'Se importă...'
                  : assemblyOnly
                    ? `${filteredRows.length}/${visibleTotal} · ${totalParts} total`
                    : `${filteredRows.length}/${totalParts}`}
              </span>
            </div>
          </div>

          {}
          <div className="mt-3 pt-3 border-t border-line/60 flex flex-wrap items-center gap-3 stagger-in">
            {LEGEND.map(l => (
              <span key={l.role} className="flex items-center gap-1.5 text-pm-2xs text-content-muted">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ROLE_COLORS[l.role] }} />
                {l.label}
              </span>
            ))}
          </div>
        </Card>

        {
}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 enter-up" style={{ animationDelay: '160ms' }}>

          {
}
          <div className="lg:col-span-3 min-w-0 min-h-0" key={selectedId ?? 'empty'}>
            {selectedNode ? (
              <Card padding="none" tone="elevated" className="overflow-hidden flex flex-col h-full min-h-0 enter-up">
                {}
                <div className="shrink-0 border-b border-line px-4 py-3 flex items-center gap-2">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-sm" style={{ backgroundColor: catColor(selectedNode.category) }} />
                  <span className="font-medium text-pm-sm text-content-primary truncate flex-1 min-w-0">{selectedNode.name}</span>
                  <IconButton
                    size="sm"
                    onClick={() => setSelectedId(null)}
                    title="Închide detaliile"
                    aria-label="Închide detaliile"
                  >
                    <X />
                  </IconButton>
                </div>
                {}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {}
                  <div className="border-b border-line px-4 py-2">
                    <span className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Detalii</span>
                  </div>
                  {}
                  <div className="flex flex-col">
                    {[
                      ['Categorie', selectedNode.category],
                      ['Tip fisier', selectedNode.file_type || '-'],
                      ['Dimensiune', formatSize(selectedNode.file_size) || '-'],
                      ['Sub-piese', String(selectedNode.children.length)],
                      ['Total desc.', String(countTotal(selectedNode.children))],
                    ].map(([label, val]) => (
                      <div key={label} className="border-b border-line px-4 py-2 flex justify-between items-center">
                        <span className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">{label}</span>
                        <span className="text-pm-xs text-content-primary font-medium capitalize">{val}</span>
                      </div>
                    ))}
                  </div>
                  {selectedNode.file_name && (
                    <div className="border-b border-line px-4 py-2">
                      <div className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-1">Fisier</div>
                      <div className="text-content-primary font-mono text-pm-2xs break-all">{selectedNode.file_name}</div>
                    </div>
                  )}
                  {selectedNode.file_path && (
                    <div className="border-b border-line px-4 py-2">
                      <div className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-1">Cale</div>
                      <div className="text-content-secondary font-mono text-pm-2xs break-all">{selectedNode.file_path}</div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card padding="md" tone="subtle" className="h-full min-h-0 flex items-center justify-center">
                <p className="text-pm-2xs text-content-muted text-center px-2">
                  Selectează un nod din arbore pentru a vedea detaliile aici.
                </p>
              </Card>
            )}
          </div>

          {
}
          <div className="lg:col-span-9 min-w-0 min-h-0">
            <Card padding="none" tone="elevated" className="overflow-hidden flex flex-col h-full min-h-0">

              {


}
              {uploadProgress && (() => {
                const { current, total, fileName, bytesDone, bytesTotal, startedAt } = uploadProgress;
                const pct = bytesTotal > 0 ? Math.min(100, Math.floor((bytesDone / bytesTotal) * 100)) : 0;
                const elapsedSec = Math.max(1, (Date.now() - startedAt) / 1000);
                const mbps = (bytesDone / 1024 / 1024) / elapsedSec;
                const etaSec = mbps > 0 ? Math.floor(((bytesTotal - bytesDone) / 1024 / 1024) / mbps) : 0;
                const etaLabel = etaSec > 60 ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s` : `${etaSec}s`;
                return (
                  <div className="shrink-0 border-b border-line bg-accent/5 px-4 py-2.5 enter-up">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" />
                      <span className="text-pm-xs font-semibold text-content-primary">
                        Încărcare fișiere — {current + 1} / {total}
                      </span>
                      <span className="text-pm-2xs text-content-muted font-mono ml-auto tabular-nums">
                        {formatSize(bytesDone)} / {formatSize(bytesTotal)} · {mbps.toFixed(1)} MB/s · ~{etaLabel} rămas
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent anim-bar-grow"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-pm-2xs text-content-muted font-mono mt-1 truncate" title={fileName}>
                      {fileName}
                    </p>
                  </div>
                );
              })()}

              {}
              {showFolderInput && (
                <div className="shrink-0 flex gap-2 items-center px-5 py-2 border-b border-line bg-surface-secondary">
                  <input value={folderPath} onChange={e => setFolderPath(e.target.value)} placeholder="C:\Proiecte\Piese"
                    className="flex-1 min-w-0 h-8 rounded-lg border border-line/70 bg-surface-secondary/40 px-3 text-pm-sm font-mono text-content-primary placeholder:text-content-muted transition-smooth duration-150 hover:border-content-muted/50 focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)] focus:shadow-[var(--ring-soft)]" />
                  <Button size="sm" onClick={handleScanFolder} disabled={!folderPath.trim() || importing}>
                    <Upload className="h-3.5 w-3.5" /> Scaneaza
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowFolderInput(false); setFolderPath(''); }}>
                    Anulează
                  </Button>
                </div>
              )}

              {}
              {status && (
                <div className={`shrink-0 border-b border-line px-4 py-2 text-pm-xs enter-up ${status.type === 'ok' ? 'bg-status-green/10 text-status-green' : 'bg-status-red/10 text-status-red'}`}>
                  {status.msg}
                </div>
              )}

              {

}
              <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-hidden relative"
                onDragOver={e => { e.preventDefault(); }}
                onDrop={handleDrop}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full text-pm-xs text-content-muted">
                    <Loader2 className="h-6 w-6 animate-spin text-content-muted mr-2" /> Se încarcă...
                  </div>
                ) : treeData.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-8">
                    <EmptyState
                      icon={FileBox}
                      title={selectedProject ? 'Niciun fișier importat' : 'Selectează un proiect'}
                      description={selectedProject
                        ? 'Importă folderul cu piese CAD pentru a construi arborele proiectului.'
                        : 'Alege un proiect din selectorul de sus pentru a vedea arborele de piese.'}
                      action={selectedProject ? (
                        <Button size="sm" onClick={handlePickFolder}>
                          <FolderUp className="h-3.5 w-3.5" /> Import folder
                        </Button>
                      ) : undefined}
                    />
                  </div>
                ) : (
                  <List
                    key={treeAnimKey}
                    rowCount={filteredRows.length}
                    rowHeight={ROW_H}
                    rowComponent={TreeRowItem}
                    rowProps={rowData}
                    overscanCount={8}
                    className="h-full w-full"
                  />
                )}
              </div>
            </Card>
          </div>
        </div>

        {


}
        <Card padding="none" tone="elevated" className="shrink-0 overflow-y-auto max-h-[40vh] enter-up" style={{ animationDelay: '200ms' }}>
          <PartsTreeEnhancements
            projectId={selectedProject}
            pieces={pieces.map(p => ({
              id: p.id,
              name: p.name,
              category: p.category,
              quantity: p.quantity,
              parent_id: (p as ProjectPiece & { parent_id?: number | null }).parent_id ?? null,
              file_path: (p as ProjectPiece & { file_path?: string | null }).file_path ?? null,
              estimated_hours: (p as ProjectPiece & { estimated_hours?: number | null }).estimated_hours ?? null,
              estimated_cost: (p as ProjectPiece & { estimated_cost?: number | null }).estimated_cost ?? null,
            }))}
          />
        </Card>

      </Page.Body>

      <FormModal
        isOpen={addOpen}
        onClose={closeAddModal}
        title="Adaugă piesa"
        submitLabel="Adaugă"
        fields={[
          { name: 'name',     label: 'Nume piesa', type: 'text',   required: true,  placeholder: 'ex. Malaxor M60' },
          { name: 'category', label: 'Categorie', type: 'select', required: true,  options: PIECE_CATEGORIES },
          { name: 'stage_id', label: 'Etapa',     type: 'select', required: true,
            options: stages.map(s => ({ value: s.id, label: s.name })) },
          { name: 'quantity', label: 'Cantitate', type: 'number', required: true,  placeholder: '1' },
        ] as FormField[]}
        onSubmit={async (data) => {
          if (!selectedProject) return;
          try {
            await createPieceStore(selectedProject, {
              project_id: selectedProject,
              stage_id:   Number(data.stage_id),
              name:       String(data.name ?? ''),
              category:   String(data.category ?? 'altele'),
              quantity:   Number(data.quantity ?? 1),
            });
            toast.success('Piesa adaugata');
            loadTree();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Eroare la adaugarea piesei');
          }
        }}
      />

      <SupplierCodesModal
        open={codesModalOpen}
        onClose={() => setCodesModalOpen(false)}
        isAdmin={isAdmin}
        onChanged={() => {  }}
      />
    </Page>
  );
}
