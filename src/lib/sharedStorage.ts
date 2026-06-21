import { getServerUrl } from '@/config/server';
import { getPromixToken } from '@/lib/session';

export interface SharedStorageItem {
  key: string;
  value: unknown;
  updatedAt: string;
  scope: 'user' | 'company' | 'global';
}

export interface SharedFile {
  id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string | null;
  data: string | null;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
  description?: string | null;
  folder_id?: number | null;
}

export interface SharedFolder {
  id: number;
  name: string;
  parent_id: number | null;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export interface SharedFileUploadParams {
  file: File;
  filename: string;
  mime_type: string;
  size_bytes: number;
  description?: string | null;
  folder_id?: number | null;
}

const STORAGE_PREFIX = 'shared_storage_';

// Browser-native base64 encoder. `Buffer` is a Node-only API and is NOT bundled
// for the browser, so the old `Buffer.from(...).toString('base64')` threw a
// ReferenceError and every upload failed. FileReader handles binary correctly at
// any size; we strip the `data:<mime>;base64,` prefix that readAsDataURL adds.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

class SharedStorageService {
  private get baseUrl(): string {
    return getServerUrl();
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = getPromixToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private localStorageKey(key: string, scope: string): string {
    return `${STORAGE_PREFIX}${scope}:${key}`;
  }

  // --- Key-value storage (legacy) ---
  async get<T>(key: string, scope: 'user' | 'company' | 'global' = 'user'): Promise<T | null> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.baseUrl}/api/shared-storage/${scope}/${key}`, {
        headers,
      });
      if (!res.ok) {
        const local = localStorage.getItem(this.localStorageKey(key, scope));
        return local ? JSON.parse(local) as T : null;
      }
      const data = await res.json() as SharedStorageItem;
      localStorage.setItem(this.localStorageKey(key, scope), JSON.stringify(data.value));
      return data.value as T;
    } catch {
      const local = localStorage.getItem(this.localStorageKey(key, scope));
      return local ? JSON.parse(local) as T : null;
    }
  }

  async set<T>(key: string, value: T, scope: 'user' | 'company' | 'global' = 'user'): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.baseUrl}/api/shared-storage/${scope}/${key}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, value, scope }),
      });
      const success = res.ok;
      if (success) {
        localStorage.setItem(this.localStorageKey(key, scope), JSON.stringify(value));
      }
      return success;
    } catch {
      try {
        localStorage.setItem(this.localStorageKey(key, scope), JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
  }

  async delete(key: string, scope: 'user' | 'company' | 'global' = 'user'): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`${this.baseUrl}/api/shared-storage/${scope}/${key}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        localStorage.removeItem(this.localStorageKey(key, scope));
        return true;
      }
      return false;
    } catch {
      try {
        localStorage.removeItem(this.localStorageKey(key, scope));
        return true;
      } catch {
        return false;
      }
    }
  }

  async list(scope: 'user' | 'company' | 'global' = 'user', userId?: string, companyId?: string): Promise<SharedStorageItem[]> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (companyId) params.append('companyId', companyId);
      
      const res = await fetch(`${this.baseUrl}/api/shared-storage/${scope}?${params.toString()}`, {
        headers,
      });
      if (!res.ok) return [];
      return res.json() as Promise<SharedStorageItem[]>;
    } catch {
      return [];
    }
  }

  // --- Shared Files (global storage pool) ---
  async listFiles(folderId: number | null = null): Promise<SharedFile[]> {
    const headers = await this.getAuthHeaders();
    const q = folderId != null ? `?folder_id=${folderId}` : '';
    // no-store: the file list changes on every upload/delete; a cached snapshot
    // would make a just-uploaded file "not show up" until the cache expires.
    const res = await fetch(`${this.baseUrl}/api/shared-files${q}`, { headers, cache: 'no-store' });
    if (!res.ok) return [];
    return res.json() as Promise<SharedFile[]>;
  }

  async getSharedFile(id: number): Promise<SharedFile | null> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/shared-files/${id}`, { headers, cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<SharedFile>;
  }

  async uploadFile(params: SharedFileUploadParams): Promise<SharedFile> {
    const { file, filename, mime_type, size_bytes, description, folder_id } = params;

    const data = await fileToBase64(file);

    const body = { filename, mime_type, size_bytes, data, description, folder_id: folder_id ?? null };
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/shared-files`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Upload failed (${res.status})${detail ? ': ' + detail : ''}`);
    }
    return res.json() as Promise<SharedFile>;
  }

  async deleteSharedFile(id: number): Promise<boolean> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/shared-files/${id}`, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  }

  async downloadFile(id: number): Promise<Blob> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/shared-files/${id}/download`, { headers });
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }

  // --- Folders ---
  async listFolders(parentId: number | null = null): Promise<SharedFolder[]> {
    const headers = await this.getAuthHeaders();
    const q = parentId != null ? `?parent_id=${parentId}` : '';
    const res = await fetch(`${this.baseUrl}/api/shared-folders${q}`, { headers, cache: 'no-store' });
    if (!res.ok) return [];
    return res.json() as Promise<SharedFolder[]>;
  }

  async createFolder(name: string, parentId: number | null = null): Promise<SharedFolder> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/shared-folders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, parent_id: parentId ?? null }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.message || 'Nu s-a putut crea folderul');
    }
    return res.json() as Promise<SharedFolder>;
  }

  async deleteFolder(id: number): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/shared-folders/${id}`, { method: 'DELETE', headers });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.message || 'Nu s-a putut șterge folderul');
    }
  }
}

export const sharedStorage = new SharedStorageService();