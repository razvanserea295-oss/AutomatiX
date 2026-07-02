import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FolderOpen, FolderPlus, HardDrive, Trash2, Upload } from '@/icons';
import { toast } from 'sonner';
import { sharedStorage, type SharedFile, type SharedFolder } from '@/lib/sharedStorage';
import { confirmDialog } from '@/components/ConfirmDialog';
import { formatDateRo } from '@/lib/format';
import { Page, PageHeader, PageBody, PageKpis, DataTableCard } from '@/v2/components/app/Page';
import { KPICard } from '@/v2/analytics';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Button } from '@/v2/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/v2/components/ui/table';

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function SharedFilesPage() {
  const [folderId, setFolderId] = useState<number | null>(null);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      sharedStorage.listFolders(folderId),
      sharedStorage.listFiles(folderId),
    ])
      .then(([f, fl]) => {
        setFolders(f);
        setFiles(fl);
      })
      .catch(() => toast.error('Nu s-au putut încărca fișierele'))
      .finally(() => setLoading(false));
  }, [folderId]);

  useEffect(() => { reload(); }, [reload]);

  const upload = async (f: File | undefined) => {
    if (!f) return;
    try {
      await sharedStorage.uploadFile({
        file: f, filename: f.name, mime_type: f.type || 'application/octet-stream', size_bytes: f.size, folder_id: folderId,
      });
      toast.success('Fișier încărcat');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload eșuat');
    }
  };

  const createFolder = async () => {
    const name = window.prompt('Nume folder:');
    if (!name?.trim()) return;
    try {
      await sharedStorage.createFolder(name.trim(), folderId);
      toast.success('Folder creat');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const removeFile = async (file: SharedFile) => {
    const ok = await confirmDialog({ title: 'Șterge fișier', body: file.filename ?? undefined, danger: true });
    if (!ok) return;
    try {
      await sharedStorage.deleteSharedFile(file.id);
      toast.success('Șters');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const download = async (file: SharedFile) => {
    try {
      const blob = await sharedStorage.downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download eșuat');
    }
  };

  const kpis = useMemo(() => ({
    folders: folders.length,
    files: files.length,
    size: files.reduce((s, f) => s + (f.size_bytes || 0), 0),
  }), [folders, files]);

  return (
    <Page fill>
      <PageHeader
        title="Fișiere partajate"
        description="Spațiu comun de fișiere pentru echipă"
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => void createFolder()}><FolderPlus className="mr-2 h-4 w-4" />Folder</Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Încarcă</Button>
          </>
        }
      />
      <PageBody>
        <PageKpis>
          <KPICard label="Foldere" value={kpis.folders} icon={<FolderOpen className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Fișiere" value={kpis.files} icon={<HardDrive className="h-4 w-4 text-muted-foreground" />} />
          <KPICard label="Spațiu folosit" value={Math.round(kpis.size / 1024)} hint="KB" />
        </PageKpis>
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
        {folderId !== null && (
          <Button variant="link" className="h-auto p-0" onClick={() => setFolderId(null)}>← Înapoi la rădăcină</Button>
        )}
        <AsyncContent loading={loading} error={null} empty={folders.length === 0 && files.length === 0}>
          <DataTableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Dimensiune</TableHead>
                  <TableHead>Încărcat</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody stagger>
                {folders.map((f) => (
                  <TableRow key={`f-${f.id}`} className="cursor-pointer" onClick={() => setFolderId(f.id)}>
                    <TableCell className="font-medium">📁 {f.name}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{formatDateRo(f.created_at)}</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
                {files.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.filename}</TableCell>
                    <TableCell>{fmtSize(f.size_bytes)}</TableCell>
                    <TableCell>{formatDateRo(f.created_at)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => void download(f)}><Download className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => void removeFile(f)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </AsyncContent>
      </PageBody>
    </Page>
  );
}
