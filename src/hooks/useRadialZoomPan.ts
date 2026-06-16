import { useState, useCallback, useRef, useEffect } from 'react';

interface ZoomPanState {
  zoom: number;
  panX: number;
  panY: number;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.001;

export function useRadialZoomPan(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState<ZoomPanState>({ zoom: 1, panX: 0, panY: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setState(prev => {
      const delta = -e.deltaY * ZOOM_STEP;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom * (1 + delta)));
      const ratio = newZoom / prev.zoom;

      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, zoom: newZoom };

      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;

      return {
        zoom: newZoom,
        panX: cx - ratio * (cx - prev.panX),
        panY: cy - ratio * (cy - prev.panY),
      };
    });
  }, [containerRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setState(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const fitToView = useCallback((maxRadius: number) => {
    const el = containerRef.current;
    if (!el || maxRadius <= 0) return;
    const { width, height } = el.getBoundingClientRect();
    const padding = 40;
    const diameter = maxRadius * 2;
    const fitZoom = Math.min((width - padding) / diameter, (height - padding) / diameter, 1.5);
    setState({ zoom: Math.max(0.05, fitZoom), panX: 0, panY: 0 });
  }, [containerRef]);

  
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [containerRef, handleWheel]);

  return {
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    fitToView,
  };
}
