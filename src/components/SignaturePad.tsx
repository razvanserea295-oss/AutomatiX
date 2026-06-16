import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Loader2, X, Check } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';

export interface Signature {
  id: number;
  target_type: string;
  target_id: number;
  role_label: string;
  signer_name: string;
  image_base64: string;
  signed_by_name: string | null;
  signed_at: string;
  notes: string | null;
}




export function SignatureCanvas({ onChange }: { onChange: (base64: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--color-text-primary').trim() || '#0f172a';
  }, []);

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const p = getPoint(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPoint.current = p;
    if (!hasDrawn) {
      setHasDrawn(true);
      const data = canvasRef.current!.toDataURL('image/png').split(',')[1];
      onChange(data);
    }
  };

  const onPointerUp = () => {
    drawing.current = false;
    lastPoint.current = null;
    if (hasDrawn) {
      const data = canvasRef.current!.toDataURL('image/png').split(',')[1];
      onChange(data);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <div>
      <div className="border-2 border-dashed border-line rounded bg-white" style={{ height: 180 }}>
        <canvas ref={canvasRef}
          style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair', display: 'block' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp} />
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-pm-2xs text-content-muted">{hasDrawn ? 'Semnat' : 'Desenează deasupra'}</span>
        <button onClick={clear} className="text-pm-2xs px-2 py-1 rounded text-content-muted hover:bg-surface-tertiary inline-flex items-center gap-1">
          <Eraser className="h-3 w-3" /> Șterge
        </button>
      </div>
    </div>
  );
}




export function SignatureDialog({ targetType, targetId, defaultRole, onClose, onSaved }: {
  targetType: string; targetId: number;
  defaultRole?: string;
  onClose: () => void;
  onSaved?: (sig: Signature) => void;
}) {
  const [role, setRole] = useState(defaultRole || 'Beneficiar');
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error('Nume semnatar obligatoriu'); return; }
    if (!image) { toast.error('Semnătura este goală'); return; }
    setSubmitting(true);
    try {
      const sig = await apiCommand<Signature>('add_signature', {
        request: { target_type: targetType, target_id: targetId, role_label: role, signer_name: name, image_base64: image },
      });
      toast.success('Semnătură salvată');
      onSaved?.(sig);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare salvare');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-primary rounded border border-line w-full max-w-md">
        <div className="border-b border-line p-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Semnătură digitală</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-tertiary"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Rol semnatar</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 text-sm border border-line rounded bg-surface-primary">
              <option value="Beneficiar">Beneficiar</option>
              <option value="Prestator">Prestator</option>
              <option value="Manager">Manager</option>
              <option value="Proiectant">Proiectant</option>
              <option value="Sef hala">Șef hală</option>
              <option value="Tehnician">Tehnician</option>
              <option value="Other">Altul</option>
            </select>
          </div>
          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Nume semnatar</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Nume Prenume"
              className="w-full px-3 py-2 text-sm border border-line rounded bg-surface-primary" />
          </div>
          <div>
            <label className="block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1">Semnează aici</label>
            <SignatureCanvas onChange={setImage} />
          </div>
        </div>
        <div className="border-t border-line p-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-line hover:bg-surface-tertiary">Anulează</button>
          <button onClick={submit} disabled={submitting || !image || !name.trim()}
            className="px-4 py-1.5 text-xs rounded bg-accent text-surface-primary font-semibold disabled:opacity-50 inline-flex items-center gap-1">
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Salvează
          </button>
        </div>
      </div>
    </div>
  );
}




export function SignaturesList({ targetType, targetId, addable = true, defaultRole }: {
  targetType: string; targetId: number; addable?: boolean; defaultRole?: string;
}) {
  const [sigs, setSigs] = useState<Signature[]>([]);
  const [showDialog, setShowDialog] = useState(false);

  const fetch = useCallback(() => {
    apiCommand<Signature[]>('list_signatures', { target_type: targetType, target_id: targetId })
      .then(setSigs).catch(() => setSigs([]));
  }, [targetType, targetId]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Semnături ({sigs.length})</h4>
        {addable && (
          <button onClick={() => setShowDialog(true)}
            className="text-pm-2xs px-2 py-0.5 rounded bg-accent/15 text-accent font-semibold hover:bg-accent/25">
            + Semnează
          </button>
        )}
      </div>

      {sigs.length === 0 ? (
        <p className="text-pm-2xs text-content-muted italic">Nicio semnătură încă.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {sigs.map(s => (
            <div key={s.id} className="bg-surface-secondary rounded border border-line p-2">
              <div className="bg-white rounded h-20 flex items-center justify-center overflow-hidden mb-2">
                <img src={`data:image/png;base64,${s.image_base64}`} alt="signature"
                  loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
              </div>
              <p className="text-xs font-semibold text-content-primary">{s.signer_name}</p>
              <p className="text-pm-2xs text-content-muted">{s.role_label} • {new Date(s.signed_at).toLocaleString('ro-RO')}</p>
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <SignatureDialog targetType={targetType} targetId={targetId} defaultRole={defaultRole}
          onClose={() => setShowDialog(false)}
          onSaved={() => fetch()} />
      )}
    </div>
  );
}
