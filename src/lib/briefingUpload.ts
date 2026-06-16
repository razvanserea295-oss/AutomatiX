











import { getServerUrl } from '@/config/server';
import { STORAGE_KEYS, getStorage } from '@/config/localStorage';


export const BRIEFING_MAX_BYTES = 500 * 1024 * 1024; 
const CHUNK_SIZE = 4 * 1024 * 1024;                  

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

function newSession(): string {
  
  const rnd = () => Math.random().toString(36).slice(2);
  return (rnd() + rnd() + rnd()).slice(0, 32);
}

export interface UploadProgress { sent: number; total: number; pct: number; }






export async function uploadBriefingFile(
  briefingId: number,
  file: File,
  note: string | null,
  onProgress?: (p: UploadProgress) => void,
): Promise<number> {
  if (file.size > BRIEFING_MAX_BYTES) {
    throw new Error(`Fișierul „${file.name}" depășește 500 MB`);
  }

  const base = getServerUrl();
  const token = getStorage(STORAGE_KEYS.TOKEN) || '';
  const session = newSession();
  const total = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

  let lastId = 0;
  for (let i = 0; i < total; i++) {
    const start = i * CHUNK_SIZE;
    const chunk = file.slice(start, Math.min(file.size, start + CHUNK_SIZE));
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'X-Upload-Session': session,
      'X-Chunk-Index': String(i),
      'X-Chunk-Total': String(total),
      'X-File-Size': String(file.size),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    
    headers['X-File-Name-B64'] = b64(file.name);
    headers['X-File-Mime-B64'] = b64(file.type || 'application/octet-stream');
    if (note) headers['X-File-Note-B64'] = b64(note);

    const res = await fetch(`${base}/api/briefing/${briefingId}/upload-chunk`, {
      method: 'POST', headers, body: chunk,
    });
    if (!res.ok) {
      let msg = `Upload eșuat (${res.status})`;
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch {  }
      throw new Error(msg);
    }
    const sent = Math.min(file.size, start + chunk.size);
    onProgress?.({ sent, total: file.size, pct: Math.round((sent / Math.max(file.size, 1)) * 100) });
    if (i === total - 1) {
      const j = await res.json().catch(() => ({}));
      lastId = Number(j?.id) || 0;
    }
  }
  return lastId;
}
