







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
      className="group absolute top-0 bottom-0 -right-px flex w-2 cursor-col-resize items-center justify-center bg-transparent transition-colors duration-150 hover:bg-accent-muted active:bg-accent-muted focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionează coloana"
    >
      <span
        aria-hidden
        className="h-3.5 w-0.5 rounded-full bg-line transition-colors duration-150 group-hover:bg-accent/60 group-active:bg-accent"
      />
    </span>
  );
}
