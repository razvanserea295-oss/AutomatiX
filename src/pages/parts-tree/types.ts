



export interface PartTreeNode {
  name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category: string;
  db_id?: number | null;
  
  supplier_code?: string | null;
  children: PartTreeNode[];
}

export type NodeColorType = 'root' | 'semi' | 'branch' | 'branch-leaf' | 'leaf';

export interface LayoutNode {
  id: string;
  node: PartTreeNode;
  x: number;
  y: number;
  depth: number;
  parentId: string | null;
  childCount: number;
  totalDescendants: number;
  colorType: NodeColorType;
}

export interface LayoutEdge {
  id: string;
  source: { x: number; y: number };
  target: { x: number; y: number };
}


export type RadialLayoutNode = LayoutNode;
export type RadialEdge = LayoutEdge;

export type ViewMode = 'tree' | 'list';

export const CAT_COLORS: Record<string, string> = {
  malaxor: '#F97316',
  pompa: '#10B981',
  motor: '#F59E0B',
  hidraulica: '#EF4444',
  structura: '#6B7280',
  automatizare: '#8B5CF6',
  skip: '#EC4899',
  siloz: '#14B8A6',
  buncar: '#D97706',
  cantar: '#6366F1',
  generic: '#9CA3AF',
};

export function catColor(c: string): string {
  return CAT_COLORS[c] || CAT_COLORS.generic;
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function countTotal(nodes: PartTreeNode[]): number {
  return nodes.reduce((s, n) => s + 1 + countTotal(n.children), 0);
}
