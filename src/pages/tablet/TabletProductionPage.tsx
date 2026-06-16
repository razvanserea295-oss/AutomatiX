import { useState, useEffect, useCallback } from 'react';
import { Loader2, Play, Square, Camera, CheckCircle, LogOut, Clock, ChevronDown } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { toast } from '@/store/toastStore';

interface ProjectPiece {
  id: number; project_id: number; project_name: string;
  stage_id: number; stage_name: string | null;
  name: string; category: string; quantity: number;
  status: string;
}

interface ActiveTimer {
  entry_id: number; piece_id: number | null; piece_name: string | null;
  project_name: string | null; started_at: string; elapsed_seconds: number;
}

const STATUS_TONE: Record<string, string> = {
  planificat: 'bg-status-amber/10 text-status-amber',
  in_productie: 'bg-status-amber/15 text-status-amber',
  fabricat: 'bg-status-green/15 text-status-green',
  livrat: 'bg-accent/10 text-accent',
  montat: 'bg-accent/15 text-accent',
  testat: 'bg-status-green/10 text-status-green',
};

function fmtHMS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TabletProductionPage({ user, onLogout }: {
  user: User | null; onLogout?: () => void;
}) {
  const [projects, setProjects] = useState<Array<{ id: number; name: string; status: string }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [pieces, setPieces] = useState<ProjectPiece[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [showSignOff, setShowSignOff] = useState<ProjectPiece | null>(null);

  const refreshActive = useCallback(() => {
    apiCommand<ActiveTimer | null>('time_get_active').then(setActiveTimer).catch(() => setActiveTimer(null));
  }, []);

  useEffect(() => {
    apiCommand<any[]>('get_projects').then(ps => {
      const active = (ps || []).filter(p => p.status !== 'finalizat' && p.status !== 'anulat');
      setProjects(active);
      if (active.length > 0 && !selectedProjectId) setSelectedProjectId(active[0].id);
    }).catch(() => setProjects([])).finally(() => setLoading(false));
    refreshActive();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) { setPieces([]); return; }
    apiCommand<ProjectPiece[]>('get_project_pieces', { project_id: selectedProjectId })
      .then(p => setPieces(p.filter((pp: any) => pp.status !== 'testat')))
      .catch(() => setPieces([]));
  }, [selectedProjectId]);

  useEffect(() => {
    if (!activeTimer) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeTimer]);

  const startTimer = async (piece: ProjectPiece) => {
    try {
      await apiCommand('time_start', { piece_id: piece.id });
      toast.success(`Pornit: ${piece.name}`);
      refreshActive();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const stopTimer = async () => {
    try {
      await apiCommand('time_stop', {});
      toast.success('Oprit');
      setActiveTimer(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const updateStatus = async (piece: ProjectPiece, status: string) => {
    try {
      await apiCommand('update_project_piece', { request: { id: piece.id, status } });
      setPieces(prev => prev.map(p => p.id === piece.id ? { ...p, status } : p));
      toast.success(`${piece.name} → ${status}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-page">
        <Loader2 className="h-12 w-12 animate-spin text-content-muted" />
      </div>
    );
  }

  const elapsed = activeTimer ? activeTimer.elapsed_seconds + tick : 0;

  return (
    <div className="h-full overflow-y-auto bg-surface-page flex flex-col">
      {}
      <header className="bg-surface-tertiary text-content-primary px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-line">
        <div>
          <h1 className="text-pm-lg font-semibold">Statie productie</h1>
          {user && <p className="text-pm-xs text-content-muted">{user.full_name || user.username}</p>}
        </div>
        <button onClick={onLogout} className="p-3 bg-surface-secondary hover:bg-surface-primary text-pm-sm flex items-center gap-2 border border-line">
          <LogOut className="h-4 w-4" /> Iesire
        </button>
      </header>

      {}
      {activeTimer && (
        <div className="bg-status-green/15 text-status-green px-6 py-4 flex items-center justify-between sticky top-[72px] z-20 border-b border-line">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6" />
            <div>
              <p className="text-2xl font-mono font-semibold tabular-nums">{fmtHMS(elapsed)}</p>
              <p className="text-pm-xs opacity-90">{activeTimer.piece_name} -- {activeTimer.project_name}</p>
            </div>
          </div>
          <button onClick={stopTimer} className="px-6 py-3 bg-status-red text-surface-primary font-semibold flex items-center gap-2 text-pm-base hover:opacity-90">
            <Square className="h-5 w-5" /> STOP
          </button>
        </div>
      )}

      {}
      <div className="px-6 py-4 bg-surface-secondary border-b border-line sticky top-[72px] z-10" style={{ top: activeTimer ? 152 : 72 }}>
        <label className="block text-pm-2xs uppercase font-semibold text-content-muted mb-2">Proiect curent</label>
        <div className="relative">
          <select value={selectedProjectId || ''} onChange={e => setSelectedProjectId(Number(e.target.value))}
            className="w-full text-pm-lg font-semibold px-4 py-3 rounded-md border border-line bg-surface-primary appearance-none text-content-primary transition-colors hover:border-content-muted/50 focus:outline-none focus:border-accent focus:shadow-[var(--ring-soft)]">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-content-muted pointer-events-none" />
        </div>
      </div>

      {}
      <main className="flex-1 flex flex-col">
        {pieces.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-surface-secondary border-b border-line">
            <p className="text-pm-base text-content-muted">Nicio piesa activa pentru acest proiect</p>
          </div>
        ) : (
          <div className="flex flex-col max-w-3xl mx-auto w-full">
            {pieces.map(piece => {
              const isActive = activeTimer?.piece_id === piece.id;
              return (
                <div key={piece.id} className={`bg-surface-secondary border-b border-line p-4 ${isActive ? 'border-l-4 border-l-status-green' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-pm-base font-semibold text-content-primary">{piece.name}</h3>
                      <p className="text-pm-xs text-content-muted">{piece.category} -- {piece.quantity} buc</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold uppercase ${STATUS_TONE[piece.status] || 'bg-surface-tertiary text-content-muted'}`}>
                      {piece.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-0">
                    {!isActive ? (
                      <button onClick={() => startTimer(piece)}
                        className="col-span-2 px-4 py-3 bg-status-green text-surface-primary font-semibold flex items-center justify-center gap-2 text-pm-base border border-status-green hover:opacity-90">
                        <Play className="h-5 w-5" /> START
                      </button>
                    ) : (
                      <button onClick={stopTimer}
                        className="col-span-2 px-4 py-3 bg-status-red text-surface-primary font-semibold flex items-center justify-center gap-2 text-pm-base border border-status-red hover:opacity-90">
                        <Square className="h-5 w-5" /> STOP
                      </button>
                    )}

                    {piece.status === 'planificat' && (
                      <button onClick={() => updateStatus(piece, 'in_productie')}
                        className="px-3 py-2.5 bg-status-amber/10 text-status-amber font-semibold text-pm-sm border-t border-r border-line">
                        → In productie
                      </button>
                    )}
                    {piece.status === 'in_productie' && (
                      <button onClick={() => setShowSignOff(piece)}
                        className="px-3 py-2.5 bg-status-green/10 text-status-green font-semibold text-pm-sm flex items-center justify-center gap-1 border-t border-r border-line">
                        <CheckCircle className="h-4 w-4" /> Marchează fabricat
                      </button>
                    )}
                    {piece.status === 'fabricat' && (
                      <button onClick={() => updateStatus(piece, 'livrat')}
                        className="px-3 py-2.5 bg-accent/10 text-accent font-semibold text-pm-sm border-t border-r border-line">
                        → Livrat
                      </button>
                    )}
                    {piece.status === 'livrat' && (
                      <button onClick={() => updateStatus(piece, 'montat')}
                        className="px-3 py-2.5 bg-accent/10 text-accent font-semibold text-pm-sm border-t border-r border-line">
                        → Montat
                      </button>
                    )}
                    {piece.status === 'montat' && (
                      <button onClick={() => updateStatus(piece, 'testat')}
                        className="px-3 py-2.5 bg-status-green/10 text-status-green font-semibold text-pm-sm border-t border-r border-line">
                        → Testat
                      </button>
                    )}

                    {(piece.status === 'in_productie' || piece.status === 'fabricat') && (
                      <PhotoUploadButton pieceId={piece.id} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {}
      {showSignOff && (
        <SignOffModal piece={showSignOff} onClose={() => setShowSignOff(null)}
          onConfirm={async () => {
            await updateStatus(showSignOff, 'fabricat');
            setShowSignOff(null);
          }} />
      )}
    </div>
  );
}

function PhotoUploadButton({ pieceId }: { pieceId: number }) {
  const [uploading, setUploading] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = (reader.result as string).split(',')[1];
        await apiCommand('create_document', {
          request: {
            project_id: 0,
            category_id: 1,
            name: `Piesa ${pieceId} foto ${new Date().toLocaleString('ro-RO')}`,
            file_data: data,
            file_type: file.type,
            file_size: file.size,
            file_name: file.name,
          },
        });
        toast.success('Foto incarcata');
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare upload'); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  return (
    <label className="px-3 py-2.5 bg-surface-tertiary text-content-secondary font-semibold text-pm-sm flex items-center justify-center gap-1 cursor-pointer border-t border-line hover:bg-surface-primary">
      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      Foto
      <input type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
    </label>
  );
}

function SignOffModal({ piece, onClose, onConfirm }: {
  piece: ProjectPiece; onClose: () => void; onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-secondary w-full max-w-md p-6">
        <h3 className="text-pm-lg font-semibold text-content-primary mb-2">Confirm finalizare</h3>
        <p className="text-pm-sm text-content-secondary mb-4">{piece.name} este complet si trece la status <strong>fabricat</strong>?</p>
        <label className="flex items-center gap-2 mb-6 text-pm-sm text-content-primary">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="h-5 w-5" />
          <span>Confirm ca am verificat toate operatiile</span>
        </label>
        <div className="flex">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-line font-semibold text-content-secondary bg-surface-primary hover:bg-surface-tertiary">
            Anulează
          </button>
          <button onClick={onConfirm} disabled={!confirmed}
            className="flex-1 px-4 py-3 bg-accent text-surface-primary font-semibold disabled:opacity-50 border border-accent">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
