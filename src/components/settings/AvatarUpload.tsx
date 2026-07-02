import { useRef, useState, useEffect } from 'react';
import { Camera, Trash2, Loader2 } from '@/icons';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { avatarUrl, uploadAvatar, removeAvatar, AVATAR_MAX_BYTES } from '@/lib/avatar';
import type { User } from '@/core/types';

export default function AvatarUpload({ user }: { user: User | null }) {
  const refresh = useAuthStore(s => s.validateSession);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!user) return null;
  const current = avatarUrl(user);

  const pick = (f: File | null) => {
    if (!f) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)) {
      toast.error('Format acceptat: JPG, PNG sau WEBP'); return;
    }
    if (f.size > AVATAR_MAX_BYTES) { toast.error('Imaginea depășește 2 MB'); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadAvatar(file);
      await refresh();
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null); setFile(null);
      toast.success('Poza de profil actualizată');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Upload eșuat'));
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeAvatar();
      await refresh();
      toast.success('Poza de profil ștearsă');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Ștergere eșuată'));
    } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-5 p-4 rounded-lg border border-line bg-surface-primary">
      {}
      <Avatar src={preview || current || undefined} name={user.full_name || user.username} size="xl" />

      <div className="flex-1 min-w-0">
        <p className="text-pm-sm font-semibold text-content-primary">Poza de profil</p>
        <p className="text-pm-2xs text-content-muted mb-2.5">JPG, PNG sau WEBP · max 2 MB · </p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0] || null; e.currentTarget.value = ''; pick(f); }} />
        <div className="flex flex-wrap items-center gap-2">
          {file ? (
            <>
              <Button size="sm" onClick={() => void save()} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                {busy ? 'Se salvează…' : 'Salvează poza'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setFile(null); }} disabled={busy}>
                Anulează
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Camera className="h-3.5 w-3.5" /> {current ? 'Schimbă poza' : 'Încarcă poză'}
              </Button>
              {current && (
                <Button size="sm" variant="outline" onClick={() => void remove()} disabled={busy}
                  className="text-status-red border-status-red/40 hover:bg-status-red/10">
                  <Trash2 className="h-3.5 w-3.5" /> Șterge
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
