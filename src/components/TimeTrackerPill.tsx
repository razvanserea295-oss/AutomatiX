import { useEffect, useState, useCallback } from 'react';
import { Play, Square, Loader2, Clock } from '@/icons';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';

interface ActiveTimer {
  entry_id: number;
  piece_id: number | null;
  project_id: number | null;
  piece_name: string | null;
  project_name: string | null;
  started_at: string;
  elapsed_seconds: number;
}

function formatHMS(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function TimeTrackerPill() {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    apiCommand<ActiveTimer | null>('time_get_active').then(setActive).catch(() => setActive(null));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  
  useEffect(() => {
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const stop = async () => {
    if (!active) return;
    setLoading(true);
    try {
      await apiCommand('time_stop', {});
      toast.success('Cronometru oprit');
      setActive(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la oprire');
    } finally { setLoading(false); }
  };

  if (!active) return null;

  const elapsed = active.elapsed_seconds + tick;

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-status-green/10 border border-status-green/30 text-xs">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-green opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-status-green"></span>
      </span>
      <Clock className="h-3 w-3 text-status-green" />
      <span className="font-mono tabular-nums text-status-green font-semibold">{formatHMS(elapsed)}</span>
      {active.piece_name && (
        <span className="text-content-muted truncate max-w-[140px]" title={`${active.project_name} → ${active.piece_name}`}>
          {active.piece_name}
        </span>
      )}
      <button onClick={stop} disabled={loading}
        title="Oprește cronometru"
        className="p-1 rounded hover:bg-status-red/20 text-status-red transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
      </button>
    </div>
  );
}

export function PieceTimerButton({ pieceId, pieceName, onStarted }: {
  pieceId: number; pieceName?: string; onStarted?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [activePieceId, setActivePieceId] = useState<number | null>(null);

  useEffect(() => {
    apiCommand<ActiveTimer | null>('time_get_active').then(a => setActivePieceId(a?.piece_id ?? null)).catch(() => {});
  }, []);

  const start = async () => {
    setLoading(true);
    try {
      await apiCommand('time_start', { piece_id: pieceId });
      setActivePieceId(pieceId);
      toast.success(`Cronometru pornit${pieceName ? `: ${pieceName}` : ''}`);
      onStarted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la pornire');
    } finally { setLoading(false); }
  };

  const stop = async () => {
    setLoading(true);
    try {
      await apiCommand('time_stop', {});
      setActivePieceId(null);
      toast.success('Cronometru oprit');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la oprire');
    } finally { setLoading(false); }
  };

  const isThisActive = activePieceId === pieceId;

  return (
    <button onClick={isThisActive ? stop : start} disabled={loading}
      title={isThisActive ? 'Oprește cronometru' : 'Pornește cronometru'}
      className={`p-1 rounded transition-colors disabled:opacity-50 ${
        isThisActive
          ? 'bg-status-green/15 text-status-green hover:bg-status-red/20 hover:text-status-red'
          : 'text-content-muted hover:bg-surface-tertiary hover:text-status-green'
      }`}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : isThisActive ? <Square className="h-3.5 w-3.5" />
        : <Play className="h-3.5 w-3.5" />}
    </button>
  );
}
