import React from 'react';
import type { LayoutEdge } from './types';
import { edgePath } from './RadialTreeLayout';

interface Props {
  edge: LayoutEdge;
  isHighlighted: boolean;
  color?: string;
}

function RadialTreeEdgeInner({ edge, isHighlighted, color }: Props) {
  return (
    <path
      d={edgePath(edge)}
      fill="none"
      stroke={isHighlighted ? (color || '#F0C420') : 'var(--color-border)'}
      strokeWidth={isHighlighted ? 2 : 1}
      opacity={isHighlighted ? 0.9 : 0.5}
    />
  );
}

export const RadialTreeEdge = React.memo(RadialTreeEdgeInner, (prev, next) =>
  prev.edge.id === next.edge.id &&
  prev.isHighlighted === next.isHighlighted &&
  prev.edge.source.x === next.edge.source.x &&
  prev.edge.target.x === next.edge.target.x
);
