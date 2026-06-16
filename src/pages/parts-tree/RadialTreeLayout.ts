




import type { PartTreeNode, LayoutNode, LayoutEdge, NodeColorType } from './types';
import { countTotal } from './types';

const NODE_W = 28;
const NODE_H = 28;
const H_GAP = 12;
const V_GAP = 60;

function nodeColorType(node: PartTreeNode, depth: number): NodeColorType {
  if (depth === 0) return 'root';
  if (depth === 1 && node.children.length > 0) return 'semi';
  if (node.children.length === 0) return 'leaf';
  const allChildrenLeaves = node.children.every(c => c.children.length === 0);
  if (allChildrenLeaves) return 'branch-leaf';
  return 'branch';
}

export function computeLayout(
  trees: PartTreeNode[],
  collapsedSet: Set<string>,
): { nodes: LayoutNode[]; edges: LayoutEdge[]; maxRadius: number } {
  if (trees.length === 0) {
    return { nodes: [], edges: [], maxRadius: 0 };
  }

  
  let rootNode: PartTreeNode;
  let rootId: string;
  if (trees.length === 1) {
    rootNode = trees[0];
    rootId = 'r-0';
  } else {
    rootNode = {
      name: 'Proiect', file_name: '', file_path: '', file_size: 0,
      file_type: 'root', category: 'generic', children: trees,
    };
    rootId = 'v';
  }

  
  const widthCache = new Map<string, number>();
  function cacheSubtreeWidth(node: PartTreeNode, id: string): number {
    if (collapsedSet.has(id) || node.children.length === 0) {
      widthCache.set(id, NODE_W);
      return NODE_W;
    }
    let totalW = 0;
    node.children.forEach((child, i) => {
      if (i > 0) totalW += H_GAP;
      totalW += cacheSubtreeWidth(child, `${id}-${i}`);
    });
    const w = Math.max(NODE_W, totalW);
    widthCache.set(id, w);
    return w;
  }
  cacheSubtreeWidth(rootNode, rootId);

  const layoutNodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  let maxY = 0;

  function layoutNode(
    node: PartTreeNode,
    id: string,
    depth: number,
    xStart: number,
    parentX: number | null,
    parentY: number | null,
    parentId: string | null,
  ) {
    const myWidth = widthCache.get(id) || NODE_W;
    const x = xStart + myWidth / 2;
    const y = depth * (NODE_H + V_GAP);
    if (y > maxY) maxY = y;

    layoutNodes.push({
      id,
      node,
      x,
      y,
      depth,
      parentId,
      childCount: node.children.length,
      totalDescendants: countTotal(node.children),
      colorType: nodeColorType(node, depth),
    });

    
    if (parentX !== null && parentY !== null) {
      edges.push({
        id: `e-${id}`,
        source: { x: parentX, y: parentY + NODE_H / 2 },
        target: { x, y: y - NODE_H / 2 },
      });
    }

    
    if (!collapsedSet.has(id) && node.children.length > 0) {
      let childX = xStart;
      node.children.forEach((child, i) => {
        const childId = `${id}-${i}`;
        const childWidth = widthCache.get(childId) || NODE_W;
        layoutNode(child, childId, depth + 1, childX, x, y, id);
        childX += childWidth + H_GAP;
      });
    }
  }

  const totalWidth = widthCache.get(rootId) || NODE_W;
  layoutNode(rootNode, rootId, 0, -totalWidth / 2, null, null, null);

  return {
    nodes: layoutNodes,
    edges,
    maxRadius: Math.max(totalWidth / 2, maxY / 2 + 100),
  };
}


export const computeRadialLayout = (
  trees: PartTreeNode[],
  options: { collapsedSet: Set<string> },
) => computeLayout(trees, options.collapsedSet);


export function edgePath(edge: LayoutEdge): string {
  const { source, target } = edge;
  const midY = (source.y + target.y) / 2;
  return `M ${source.x},${source.y} L ${source.x},${midY} L ${target.x},${midY} L ${target.x},${target.y}`;
}


export const radialEdgePath = edgePath;
