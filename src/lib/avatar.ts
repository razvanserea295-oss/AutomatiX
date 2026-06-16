






import { getServerUrl } from '@/config/server';
import { STORAGE_KEYS, getStorage } from '@/config/localStorage';
import type { User } from '@/core/types';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; 
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];


export function avatarUrl(user: Pick<User, 'id' | 'avatar_path' | 'updated_at'> | null | undefined): string | null {
  if (!user || !user.avatar_path) return null;
  const v = encodeURIComponent(user.updated_at || '');
  return `${getServerUrl()}/api/avatar/${user.id}?v=${v}`;
}


export async function uploadAvatar(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error('Format acceptat: JPG, PNG sau WEBP');
  if (file.size > AVATAR_MAX_BYTES) throw new Error('Imaginea depășește 2 MB');
  const token = getStorage(STORAGE_KEYS.TOKEN) || '';
  const res = await fetch(`${getServerUrl()}/api/avatar/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
      'X-File-Mime': file.type,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: file,
  });
  if (!res.ok) {
    let msg = `Upload eșuat (${res.status})`;
    try { const j = await res.json(); if (j?.message) msg = j.message; } catch {  }
    throw new Error(msg);
  }
  const j = await res.json();
  return String(j?.avatar_path || '');
}


export async function removeAvatar(): Promise<void> {
  const token = getStorage(STORAGE_KEYS.TOKEN) || '';
  const res = await fetch(`${getServerUrl()}/api/avatar/remove`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Ștergere eșuată');
}
