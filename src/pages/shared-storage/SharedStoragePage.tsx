import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Folder, FolderPlus, Upload, Download, Trash2, FileText, Image, FileJson,
  Search, UploadCloud, ChevronRight,
} from '@/icons';
import Page from '@/components/ui/Page';
import { PageToolbar } from '@/app-ui';
import Button from '@/components/ui/Button';
import { sharedStorage, type SharedFile, type SharedFolder } from '@/lib/sharedStorage';
import { useToastStore } from '@/store/toastStore';

const FILE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'application/pdf': FileText,
  'image/': Image,
  'application/json': FileJson,
};

function getFileTypeIcon(mime: string): React.ComponentType<{ className?: string }> {
  for (const [prefix, Icon] of Object.entries(FILE_TYPE_ICONS)) {
    if (mime.startsWith(prefix)) return Icon;
  }
  return FileText;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

interface Crumb { id: number | null; name: string; }

export default function SharedStoragePage() {
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [path, setPath] = useState<Crumb[]>([{ id: null, name: 'Shared' }]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const { addToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  const currentFolderId = path[path.length - 1].id;

  const loadData = useCallback(async (folderId: number | null) => {
    setLoading(true);
    try {
      const [fld, fls] = await Promise.all([
        sharedStorage.listFolders(folderId),
        sharedStorage.listFiles(folderId),
      ]);
      setFolders(fld);
      setFiles(fls);
    } catch {
      addToast({ type: 'error', message: 'Nu s-a putut încărca conținutul' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData(currentFolderId);
  }, [currentFolderId, loadData]);

  const reload = () => loadData(currentFolderId);

  // --- Navigation ---
  const enterFolder = (folder: SharedFolder) => {
    setSearch('');
    setPath(prev => [...prev, { id: folder.id, name: folder.name }]);
  };
  const goToCrumb = (index: number) => {
    setSearch('');
    setPath(prev => prev.slice(0, index + 1));
  };

  // --- Folder create / delete ---
  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await sharedStorage.createFolder(name, currentFolderId);
      setNewFolderName('');
      setCreatingFolder(false);
      addToast({ type: 'success', message: 'Folder creat' });
      reload();
    } catch (e) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Nu s-a putut crea folderul' });
    }
  };
  const handleDeleteFolder = async (folder: SharedFolder) => {
    if (!window.confirm(`Ștergi folderul „${folder.name}"?`)) return;
    try {
      await sharedStorage.deleteFolder(folder.id);
      addToast({ type: 'success', message: 'Folder șters' });
      reload();
    } catch (e) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Nu s-a putut șterge folderul' });
    }
  };

  // --- Upload (into the current folder) ---
  const uploadFiles = async (fileList: FileList | File[]) => {
    const list = Array.from(fileList);
    if (list.length === 0) return;
    setUploading(true);
    let ok = 0;
    const failed: string[] = [];
    for (const file of list) {
      try {
        await sharedStorage.uploadFile({
          file,
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          description: '',
          folder_id: currentFolderId,
        });
        ok++;
      } catch {
        failed.push(file.name);
      }
    }
    setUploading(false);
    if (ok > 0) addToast({ type: 'success', message: ok === 1 ? 'Fișier încărcat' : `${ok} fișiere încărcate` });
    if (failed.length > 0) addToast({ type: 'error', message: `Nu s-au putut încărca: ${failed.join(', ')}` });
    reload();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
    e.target.value = ''; // allow re-selecting the same file
  };

  // --- Drag-and-drop. dragDepth guards against child enter/leave flicker. ---
  const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');
  const handleDragEnter = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepth.current++;
    setDragOver(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  // --- File download / delete ---
  const handleDownload = async (file: SharedFile) => {
    try {
      const blob = await sharedStorage.downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast({ type: 'error', message: 'Nu s-a putut descărca fișierul' });
    }
  };
  const handleDeleteFile = async (file: SharedFile) => {
    if (!window.confirm(`Ștergi fișierul „${file.filename}"?`)) return;
    try {
      await sharedStorage.deleteSharedFile(file.id);
      addToast({ type: 'success', message: 'Fișier șters' });
      reload();
    } catch {
      addToast({ type: 'error', message: 'Nu s-a putut șterge fișierul' });
    }
  };

  const q = search.toLowerCase();
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(q));
  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q)
  );
  const isEmpty = filteredFolders.length === 0 && filteredFiles.length === 0;

  return (
    <Page layout="row">
      <div
        className="relative flex-1 flex flex-col min-h-0"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-and-drop overlay */}
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-accent bg-accent/10 backdrop-blur-sm">
            <UploadCloud className="h-12 w-12 text-accent" />
            <p className="text-base font-semibold text-accent">Trage fișierele aici pentru a le încărca</p>
          </div>
        )}

        <div className="p-4">
        <PageToolbar
          toolbar={(
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Caută..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}
          actions={(
            <>
              <Button variant="secondary" onClick={() => { setCreatingFolder(true); setNewFolderName(''); }}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Folder nou
              </Button>
              <input ref={fileInputRef} type="file" multiple onChange={handleInputChange} className="hidden" />
              <Button variant="primary" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Se încarcă...' : 'Încarcă'}
              </Button>
            </>
          )}
        />

        </div>

        {/* Breadcrumb */}
        <div className="flex items-center flex-wrap gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm">
          {path.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              <button
                onClick={() => goToCrumb(i)}
                disabled={i === path.length - 1}
                className={`px-1.5 py-0.5 rounded ${
                  i === path.length - 1
                    ? 'font-semibold text-gray-900 dark:text-gray-100'
                    : 'text-accent hover:underline'
                }`}
              >
                {c.name}
              </button>
            </span>
          ))}
        </div>

        {/* Inline new-folder input */}
        {creatingFolder && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
            <FolderPlus className="w-4 h-4 shrink-0 text-gray-500" />
            <input
              autoFocus
              type="text"
              placeholder="Nume folder"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
              }}
              className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <Button variant="primary" size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Creează</Button>
            <Button variant="ghost" size="sm" onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}>Anulează</Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-500">Se încarcă...</div>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Folder className="w-12 h-12 mb-2" />
              <p>Folder gol</p>
              <p className="mt-1 text-xs text-gray-400">Trage fișiere aici, apasă „Încarcă" sau „Folder nou"</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3 font-medium">Nume</th>
                  <th className="text-left p-3 font-medium">Tip</th>
                  <th className="text-left p-3 font-medium">Mărime</th>
                  <th className="text-left p-3 font-medium">Adăugat de</th>
                  <th className="text-left p-3 font-medium">Dată</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {/* Sub-folders first */}
                {filteredFolders.map(folder => (
                  <tr key={`d${folder.id}`} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3">
                      <button
                        onClick={() => enterFolder(folder)}
                        className="flex items-center gap-2 text-left font-medium text-gray-900 dark:text-gray-100 hover:text-accent"
                      >
                        <Folder className="w-4 h-4 text-accent" />
                        {folder.name}
                      </button>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">Folder</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">-</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{folder.created_by_name}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{new Date(folder.created_at).toLocaleString('ro-RO')}</td>
                    <td className="p-3">
                      <button onClick={() => handleDeleteFolder(folder)} className="p-1 text-gray-500 hover:text-red-600" title="Șterge folderul">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Files */}
                {filteredFiles.map(file => {
                  const Icon = getFileTypeIcon(file.mime_type);
                  return (
                    <tr key={`f${file.id}`} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{file.filename}</div>
                            {file.description && <div className="text-xs text-gray-500">{file.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{file.mime_type || '-'}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{formatBytes(file.size_bytes)}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{file.uploaded_by_name}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{new Date(file.created_at).toLocaleString('ro-RO')}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDownload(file)} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" title="Descarcă">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteFile(file)} className="p-1 text-gray-500 hover:text-red-600" title="Șterge">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Page>
  );
}
