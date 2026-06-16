import React from 'react';
import type { RadialLayoutNode, NodeColorType } from './types';
import { formatSize } from './types';

interface RadialTreeNodeProps {
  node: RadialLayoutNode;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  isCollapsed: boolean;
  onClick: (id: string) => void;
  onDoubleClick: (id: string) => void;
}







const NODE_COLORS: Record<NodeColorType, { fill: string; stroke: string; label: string }> = {
  root:        { fill: '#F0C420', stroke: '#D4A800', label: '#1a1a1a' },
  semi:        { fill: '#22C55E', stroke: '#16A34A', label: '#fff' },
  branch:      { fill: '#F97316', stroke: '#EA580C', label: '#fff' },
  'branch-leaf': { fill: '#38BDF8', stroke: '#0EA5E9', label: '#fff' },
  leaf:        { fill: '#6B7280', stroke: '#4B5563', label: '#fff' },
};

const R = 12; 

function RadialTreeNodeInner({
  node, isSelected, isHighlighted, isDimmed, isCollapsed, onClick, onDoubleClick,
}: RadialTreeNodeProps) {
  const { x, y, node: data, colorType } = node;
  const colors = NODE_COLORS[colorType] || NODE_COLORS.leaf;
  const opacity = isDimmed ? 0.15 : 1;

  const isRootOrSemi = colorType === 'root' || colorType === 'semi';
  const nodeR = isRootOrSemi ? 16 : R;

  return (
    <g
      transform={`translate(${x},${y})`}
      opacity={opacity}
      onClick={() => onClick(node.id)}
      onDoubleClick={() => onDoubleClick(node.id)}
      style={{ cursor: 'pointer' }}
    >
      {}
      {isSelected && (
        <circle r={nodeR + 5} fill="none" stroke="#fff" strokeWidth={2} opacity={0.8} />
      )}

      {}
      {isHighlighted && (
        <circle r={nodeR + 6} fill="none" stroke={colors.fill} strokeWidth={2.5} opacity={0.6}>
          <animate attributeName="r" values={`${nodeR + 4};${nodeR + 10};${nodeR + 4}`} dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {}
      {isRootOrSemi ? (
        <rect
          x={-40} y={-14} width={80} height={28}
          rx={14} ry={14}
          fill={colors.fill}
          stroke={isSelected ? '#fff' : colors.stroke}
          strokeWidth={isSelected ? 2.5 : 1.5}
        />
      ) : (
        <circle
          r={nodeR}
          fill={colors.fill}
          stroke={isSelected ? '#fff' : colors.stroke}
          strokeWidth={isSelected ? 2 : 1.5}
        />
      )}

      {}
      {isCollapsed && node.childCount > 0 && (
        <text x={isRootOrSemi ? 44 : nodeR + 3} y={4} fontSize={8}
          fill="var(--color-text-muted)" textAnchor="start" fontFamily="'JetBrains Mono', monospace">
          +{node.childCount}
        </text>
      )}

      {}
      {isRootOrSemi ? (
        <text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight={600}
          fill={colors.label} fontFamily="'DM Sans', sans-serif">
          {data.name.length > 12 ? data.name.slice(0, 11) + '…' : data.name}
        </text>
      ) : (
        <text x={0} y={nodeR + 14} textAnchor="middle" fontSize={9} fontWeight={500}
          fill="var(--color-text-primary)" fontFamily="'DM Sans', sans-serif">
          {data.name.length > 14 ? data.name.slice(0, 13) + '…' : data.name}
        </text>
      )}

      <title>{data.name} — {data.category} | {data.file_type} | {formatSize(data.file_size)} | {data.file_path}</title>
    </g>
  );
}

export const RadialTreeNode = React.memo(RadialTreeNodeInner, (prev, next) =>
  prev.node.id === next.node.id &&
  prev.node.x === next.node.x &&
  prev.node.y === next.node.y &&
  prev.isSelected === next.isSelected &&
  prev.isHighlighted === next.isHighlighted &&
  prev.isDimmed === next.isDimmed &&
  prev.isCollapsed === next.isCollapsed
);
