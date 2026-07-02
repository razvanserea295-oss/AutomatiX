// The File System Access API (showSaveFilePicker) is not yet in TS's DOM lib.
interface SaveFilePickerWindow {
  showSaveFilePicker?: (opts?: { suggestedName?: string }) => Promise<{
    createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
  }>;
}

/** Save a blob produced asynchronously while preserving the user-gesture when possible. */
export async function saveBlobAfterUserGesture(
  suggestedName: string,
  load: () => Promise<Blob>,
): Promise<void> {
  const picker = (window as Window & SaveFilePickerWindow).showSaveFilePicker;
  if (typeof picker === 'function') {
    try {
      const handle = await picker({ suggestedName });
      const blob = await load();
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }

  const blob = await load();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
