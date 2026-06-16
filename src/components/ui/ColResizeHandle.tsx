




import { useRef } from 'react';

interface Props {
  onResize: (deltaPx: number) => void;
  onResizeEnd?: () => void;
}

export default function ColResizeHandle({ onResize, onResizeEnd }: Props) {
  const lastX = useRef(0);

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    
    e.preventDefault();
    e.stopPropagation();
    lastX.current = e.clientX;
    const move = (ev: PointerEvent) => {
      const delta = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      if (delta !== 0) onResize(delta);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onResizeEnd?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <span
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 bottom-0 -right-px w-1 cursor-col-resize bg-transparent hover:bg-accent/60 active:bg-accent transition-colors"
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionează coloana"
    />
  );
}
