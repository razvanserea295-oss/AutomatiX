import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, FileWarning, Search, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import DOMPurify from 'dompurify';
import { findDxfFile, loadDxfContent, pickDxfFile } from '@/utils/dxfResolver';









function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use'], 
  });
}

interface DxfViewerProps {
  
  sldprtPath: string;
  
  dxfPath?: string;
  
  compact?: boolean;
}

type ViewerState = 'loading' | 'ready' | 'not-found' | 'error';

export default function DxfViewer({ sldprtPath, dxfPath: overridePath, compact }: DxfViewerProps) {
  const [state, setState] = useState<ViewerState>('loading');
  const [svgContent, setSvgContent] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resolvedPath, setResolvedPath] = useState<string | null>(overridePath || null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  
  const loadDxf = useCallback(async (path: string) => {
    setState('loading');
    setErrorMsg('');
    try {
      const content = await loadDxfContent(path);
      const { Helper } = await import('dxf');
      const helper = new Helper(content);
      const svg = helper.toSVG();
      if (!svg || svg.trim().length < 10) {
        throw new Error('DXF-ul nu conține geometrie valida');
      }
      setSvgContent(sanitizeSvg(svg));
      setResolvedPath(path);
      setState('ready');
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Eroare la parsare DXF');
      setState('error');
    }
  }, []);

  
  useEffect(() => {
    if (!sldprtPath && !overridePath) {
      setState('not-found');
      return;
    }

    (async () => {
      if (overridePath) {
        await loadDxf(overridePath);
        return;
      }

      setState('loading');
      const found = await findDxfFile(sldprtPath);
      if (found) {
        await loadDxf(found);
      } else {
        setState('not-found');
      }
    })();
  }, [sldprtPath, overridePath, loadDxf]);

  
  const handleManualPick = useCallback(async () => {
    const picked = await pickDxfFile();
    if (picked) await loadDxf(picked);
  }, [loadDxf]);

  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(10, Math.max(0.1, z * delta)));
  }, []);

  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPan(p => ({
      x: p.x + e.clientX - lastPos.current.x,
      y: p.y + e.clientY - lastPos.current.y,
    }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);
  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const h = compact ? 'h-48' : 'h-72';

  
  if (state === 'loading') {
    return (
      <div className={`${h} rounded border border-line bg-white dark:bg-surface-primary flex items-center justify-center`}>
        <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
        <span className="ml-2 text-xs text-content-muted">Se încarcă DXF...</span>
      </div>
    );
  }

  
  if (state === 'not-found') {
    return (
      <div className={`${h} rounded border border-dashed border-line bg-surface-secondary flex flex-col items-center justify-center gap-2`}>
        <FileWarning className="h-6 w-6 text-content-muted" />
        <span className="text-xs text-content-muted">DXF negasit automat</span>
        <button onClick={handleManualPick}
          className="mt-1 px-3 py-1.5 rounded bg-accent text-surface-primary text-xs font-medium flex items-center gap-1.5 hover:opacity-90">
          <Search className="h-3 w-3" /> Caută DXF manual
        </button>
        {sldprtPath && (
          <span className="text-pm-2xs text-content-muted mt-1 max-w-[250px] truncate" title={sldprtPath}>
            Asteptat: {sldprtPath.replace(/\.SLDPRT$/i, '.dxf').split(/[/\\]/).pop()}
          </span>
        )}
      </div>
    );
  }

  
  if (state === 'error') {
    return (
      <div className={`${h} rounded border border-status-red/30 bg-status-red/5 flex flex-col items-center justify-center gap-2 p-3`}>
        <FileWarning className="h-5 w-5 text-status-red" />
        <span className="text-xs text-status-red text-center">{errorMsg}</span>
        <button onClick={handleManualPick}
          className="mt-1 px-3 py-1.5 rounded border border-line text-xs hover:bg-surface-tertiary flex items-center gap-1.5">
          <Search className="h-3 w-3" /> Alege alt DXF
        </button>
      </div>
    );
  }

  
  return (
    <div className="flex flex-col gap-1">
      {}
      {!compact && (
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => setZoom(z => Math.min(10, z * 1.2))} className="h-6 w-6 rounded border border-line hover:bg-surface-tertiary flex items-center justify-center" title="Zoom in">
            <ZoomIn className="h-3 w-3" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} className="h-6 w-6 rounded border border-line hover:bg-surface-tertiary flex items-center justify-center" title="Zoom out">
            <ZoomOut className="h-3 w-3" />
          </button>
          <button onClick={resetView} className="h-6 w-6 rounded border border-line hover:bg-surface-tertiary flex items-center justify-center" title="Reset">
            <Maximize className="h-3 w-3" />
          </button>
          <span className="text-pm-2xs text-content-muted ml-1">{Math.round(zoom * 100)}%</span>
          <div className="flex-1" />
          {resolvedPath && (
            <span className="text-pm-2xs text-content-muted truncate max-w-[200px]" title={resolvedPath}>
              {resolvedPath.split(/[/\\]/).pop()}
            </span>
          )}
          <button onClick={handleManualPick} className="h-6 px-1.5 rounded border border-line hover:bg-surface-tertiary flex items-center gap-1 text-pm-2xs text-content-muted">
            <Search className="h-2.5 w-2.5" /> Alt DXF
          </button>
        </div>
      )}

      {}
      <div
        ref={containerRef}
        className={`${h} rounded border border-line bg-white overflow-hidden cursor-grab active:cursor-grabbing`}
        style={{ aspectRatio: compact ? undefined : '4/3' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
}
