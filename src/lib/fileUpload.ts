







export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Eroare la citirea fișierului'));
    reader.readAsDataURL(file);
  });
}


export function formatFileSize(base64Len: number): string {
  if (!base64Len) return '—';
  const bytes = Math.round(base64Len * 0.75);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}


export const MAX_FILE_BYTES = 35 * 1024 * 1024;
