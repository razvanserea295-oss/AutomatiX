import { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Download, Trash2, Upload, GripVertical, Plus, Pencil, FolderOpen, Search, FolderKanban, Filter } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { ListPageSkeleton } from '@/components/Skeleton';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { useDashboardStore } from '@/store/dashboardStore';
import FormModal, { type FormField } from '@/components/FormModal';
import TableFiller from '@/components/ui/TableFiller';
import { useFormModal } from '@/hooks/useFormModal';
import { formatDateRo } from '@/lib/format';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import DocumentsEnhancements from '@/pages/documents/DocumentsEnhancements';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { filterSearchInputCls, filterSearchIconCls, filterToggleCls } from '@/components/ui/filterControls';





interface Document {
  id: number;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category_id: number;
  category_name: string;
  project_id: number | null;
  project_name: string | null;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
}

interface ProjectLite { id: number; name: string }

interface DocCategory {
  id: number;
  name: string;
  description: string;
}

interface DocumentsPageProps {
  user: User | null;
}





function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const formatDate = formatDateRo;






function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf:  'application/pdf',
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    gif:  'image/gif',
    webp: 'image/webp',
    svg:  'image/svg+xml',
    txt:  'text/plain',
    csv:  'text/csv',
    json: 'application/json',
    xml:  'application/xml',
    html: 'text/html',
    doc:  'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls:  'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt:  'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip:  'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}





export default function DocumentsPage(_props: DocumentsPageProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOpen, editingItem, openModal, closeModal, isEditing } = useFormModal();

  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  
  const dragCatRef = useRef<number | null>(null);
  const dragOverCatRef = useRef<number | null>(null);

  const handleCatDragStart = (catId: number) => {
    dragCatRef.current = catId;
  };

  const handleCatDragOver = (e: React.DragEvent, catId: number) => {
    e.preventDefault();
    dragOverCatRef.current = catId;
  };

  const handleCatDrop = () => {
    if (dragCatRef.current == null || dragOverCatRef.current == null) return;
    if (dragCatRef.current === dragOverCatRef.current) return;

    const fromIdx = categories.findIndex(c => c.id === dragCatRef.current);
    const toIdx = categories.findIndex(c => c.id === dragOverCatRef.current);
    if (fromIdx === -1 || toIdx === -1) return;

    const updated = [...categories];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setCategories(updated);

    
    
    
    const ids = updated.map(c => c.id);
    apiCommand('update_document_categories_order', { ids })
      .catch(() => {
        toast.error('Reordonare salvata doar local — server indisponibil');
        localStorage.setItem('promix_doc_cat_order', JSON.stringify(ids));
      });

    dragCatRef.current = null;
    dragOverCatRef.current = null;
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await apiCommand('create_document_category', { name: newCatName.trim(), description: '' });
      setNewCatName('');
      toast.success('Categorie adaugata');
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la adăugare categorie');
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editingCatName.trim()) return;
    try {
      await apiCommand('update_document_category', { id, name: editingCatName.trim() });
      setEditingCatId(null);
      setEditingCatName('');
      toast.success('Categorie actualizata');
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la actualizare categorie');
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [rawDocs, cats, projs] = await Promise.all([
        apiCommand<any[]>('get_documents'),
        apiCommand<DocCategory[]>('get_document_categories'),
        apiCommand<ProjectLite[]>('get_projects').catch(() => []),
      ]);
      
      
      
      const docs: Document[] = (rawDocs || []).map(d => ({
        id: d.id,
        title: d.name ?? d.title ?? '',
        description: d.description ?? '',
        file_path: d.file_path ?? '',
        file_type: d.file_type ?? '',
        file_size: d.file_size ?? 0,
        category_id: d.category_id,
        category_name: d.category_name ?? '',
        project_id: d.project_id ?? null,
        project_name: d.project_name ?? null,
        uploaded_by: d.uploaded_by ?? 0,
        uploaded_by_name: d.uploaded_by_name ?? '',
        created_at: d.uploaded_at ?? d.created_at ?? '',
      }));
      setDocuments(docs);
      setProjects(projs);
      
      try {
        const savedOrder = localStorage.getItem('promix_doc_cat_order');
        if (savedOrder) {
          const order: number[] = JSON.parse(savedOrder);
          const ordered = [...cats].sort((a, b) => {
            const ai = order.indexOf(a.id);
            const bi = order.indexOf(b.id);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
          setCategories(ordered);
        } else {
          setCategories(cats);
        }
      } catch {
        setCategories(cats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la incarcarea documentelor');
    } finally {
      setLoading(false);
    }
  }

  
  const docStats = useMemo(() => {
    const byType: Record<string, number> = {};
    documents.forEach(d => { byType[d.file_type || 'altele'] = (byType[d.file_type || 'altele'] || 0) + 1; });
    const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    return { total: documents.length, catCount: categories.length, topType: topType ? `${topType[0]} (${topType[1]})` : '—' };
  }, [documents, categories]);

  
  
  
  
  
  
  const formFields: FormField[] = [
    { name: 'name', label: 'Titlu', type: 'text', required: true, placeholder: 'Titlu document' },
    { name: 'description', label: 'Descriere', type: 'textarea', required: false, placeholder: 'Descriere document' },
    {
      name: 'category_id',
      label: 'Categorie',
      type: 'select',
      required: true,
      options: categories.length > 0
        ? categories.map(c => ({ value: c.id, label: c.name }))
        : [{ value: '', label: '— Niciuna creată — adaugă din "Categorii" —' }],
      hint: categories.length === 0
        ? 'Creează întâi o categorie din butonul "Categorii" sus.'
        : undefined,
    },
    {
      name: 'project_id',
      label: 'Proiect (optional)',
      type: 'select',
      required: false,
      options: [{ value: '', label: '— Fără proiect —' }, ...projects.map(p => ({ value: p.id, label: p.name }))],
      hint: 'Atribuie documentul unui proiect — apare apoi in pagina proiectului',
    },
    {
      name: 'file_upload',
      label: 'Selectează fisier',
      type: 'file',
      required: !isEditing,
      fileFillsFields: {
        path: 'file_path',
        type: 'file_type',
        size: 'file_size',
        name: 'original_name',
        data: 'file_data',
        mime: 'file_mime',
      },
      hint: 'Conținutul fișierului e încărcat în aplicație (max ~6 MB) ca să poată fi vizualizat.',
    },
    
    
    
    {
      name: 'file_path',
      label: 'Cale / nume fisier',
      type: 'text',
      required: false,
      placeholder: 'Auto-completat din fișier',
      hint: 'Auto-completat din fișierul selectat',
    },
    {
      name: 'file_type',
      label: 'Tip',
      type: 'text',
      required: false,
      placeholder: 'pdf, docx, xlsx',
      hint: 'Auto-completat din extensie',
    },
  ];

  const handleSubmit = async (data: Record<string, any>) => {
    
    
    const projectId = data.project_id === '' || data.project_id == null ? null : Number(data.project_id);

    
    
    const fileName = data.original_name || data.file_path || data.name || 'document';
    
    
    const payload: Record<string, any> = {
      name: data.name?.trim() || fileName,
      category_id: Number(data.category_id),
      project_id: projectId,
      file_path: data.file_path || fileName,
      file_type: data.file_type || (fileName.split('.').pop()?.toLowerCase() || 'bin'),
      file_size: Number(data.file_size) || 0,
      original_name: data.original_name || fileName,
      file_data: data.file_data || null,
      file_mime: data.file_mime || null,
    };
    if (!isEditing && !payload.file_data) {
      throw new Error('Selectează un fișier înainte de a salva.');
    }
    if (isEditing) {
      await apiCommand('update_document', { id: editingItem.id, ...payload });
      toast.success('Document actualizat');
    } else {
      await apiCommand('create_document', payload);
      toast.success('Document adaugat');
    }
    await fetchData();
    void useDashboardStore.getState().invalidate();
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge documentul?', danger: true }))) return;
    try {
      await apiCommand('delete_document', { document_id: id });
      toast.success('Document sters');
      await fetchData();
      void useDashboardStore.getState().invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la ștergere');
    }
  };

  







  const handleDownload = async (doc: Document) => {
    try {
      const file = await apiCommand<{
        data: string | null; mime: string | null; filename: string; size: number;
      }>('get_document_file', { id: doc.id });

      
      if (!file.data) {
        if (!doc.file_path) {
          toast.error('Documentul nu are conținut salvat. Re-uploadează-l.');
          return;
        }
        const url = doc.file_path.startsWith('http') || doc.file_path.startsWith('/')
          ? doc.file_path
          : `/api/files/${encodeURIComponent(doc.file_path)}`;
        window.open(url, '_blank', 'noopener');
        return;
      }

      
      const dataPart = file.data.includes(',') ? file.data.split(',')[1] : file.data;
      const mime = file.mime || guessMime(file.filename);
      const bytes = atob(dataPart);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const url = URL.createObjectURL(blob);
      
      
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la deschidere');
    }
  };

  const filteredDocuments = useMemo(() => {
    let result = selectedCategory === null
      ? documents
      : documents.filter((d) => d.category_id === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        d.category_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [documents, selectedCategory, searchQuery]);

  
  const handleBulkDelete = async () => {
    if (!(await confirmDialog({ title: 'Șterge documentele?', body: `${selectedIds.size} documente vor fi șterse permanent.`, danger: true }))) return;
    try {
      await Promise.all([...selectedIds].map(id => apiCommand('delete_document', { document_id: id })));
      toast.success(`${selectedIds.size} documente șterse`);
      setSelectedIds(new Set());
      await fetchData();
      void useDashboardStore.getState().invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la ștergere in masa');
    }
  };

  
  if (loading) return <ListPageSkeleton kpis={3} rows={10} cols={8} />;

  
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page">
        <p className="text-xs text-status-red font-medium">{error}</p>
      </div>
    );
  }

  
  return (
    <Page className="mod-shell !overflow-hidden">
      {}
      <div className="px-5 pt-4 pb-8 shrink-0 space-y-4">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Financiar"
          icon={FileText}
          title="Documente"
          subtitle="Bibliotecă de documente pe categorii și proiecte"
          actions={
            <Button size="sm" onClick={() => openModal()}>
              <Upload className="h-3.5 w-3.5" /> Adaugă document
            </Button>
          }
        />
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={FileText}     label="Total documente" value={docStats.total} />
          <KpiMini icon={FolderOpen}   label="Categorii"       value={docStats.catCount} />
          <KpiMini icon={FolderKanban} label="Cu proiect"      value={documents.filter(d => d.project_id != null).length} />
          <KpiMini icon={Filter}       label="Afișate"         value={filteredDocuments.length} />
        </div>
      </div>

      {}
      <div className="flex-1 min-h-0 overflow-y-auto enter-up" style={{ animationDelay: '160ms' }}>
        {}
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-secondary border-b border-line">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-content-muted">Documente</h2>
          <div className="relative group">
            <Search className={filterSearchIconCls} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută..."
              className={`${filterSearchInputCls} !w-64`}
            />
          </div>
        </div>

        {}
        <div className="flex flex-wrap items-center gap-0 px-4 py-2.5 bg-surface-secondary border-b border-line">
          <button
            type="button"
            aria-label="Toate categoriile"
            onClick={() => setSelectedCategory(null)}
            className={filterToggleCls(selectedCategory === null)}
          >
            Toate
          </button>
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center">
              <button
                type="button"
                draggable
                aria-label={`Filtrează: ${cat.name}`}
                onClick={() => setSelectedCategory(cat.id)}
                onDragStart={() => handleCatDragStart(cat.id)}
                onDragOver={(e) => handleCatDragOver(e, cat.id)}
                onDrop={handleCatDrop}
                className={`${filterToggleCls(selectedCategory === cat.id)} cursor-grab active:cursor-grabbing flex items-center gap-1`}
              >
                <GripVertical className="h-3 w-3 opacity-40" />
                {cat.name}
              </button>
              <button
                type="button"
                title={`Adaugă document in ${cat.name}`}
                onClick={() => { setSelectedCategory(cat.id); openModal(); }}
                className={`px-1.5 py-1.5 text-pm-2xs transition-colors border border-line ${
                  selectedCategory === cat.id
                    ? 'bg-accent text-surface-primary border-accent hover:opacity-80'
                    : 'bg-surface-primary text-content-muted hover:bg-surface-tertiary'
                }`}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowCatManager(!showCatManager)}
            className="ml-2 p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
            title="Gestioneaza categorii"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        {}
        {showCatManager && (
          <div className="bg-surface-secondary border-b border-line p-3 space-y-2">
            <h3 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Gestionare categorii</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                placeholder="Categorie noua..."
                className="flex-1 border border-line bg-surface-primary px-2 py-1.5 text-xs text-content-primary placeholder:text-content-muted"
              />
              <Button size="sm" onClick={handleAddCategory}>
                <Plus className="h-3 w-3" /> Adaugă
              </Button>
            </div>
            <div className="space-y-0">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 px-2 py-1 hover:bg-surface-tertiary border-b border-line last:border-b-0">
                  <GripVertical className="h-3 w-3 text-content-muted cursor-grab" />
                  {editingCatId === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCategory(cat.id); }}
                        className="flex-1 border border-line bg-surface-primary px-2 py-1 text-xs text-content-primary"
                        autoFocus
                      />
                      <button onClick={() => handleUpdateCategory(cat.id)} className="text-xs text-accent hover:underline font-medium">Salvează</button>
                      <button onClick={() => setEditingCatId(null)} className="text-xs text-content-muted hover:underline">Anulează</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-xs text-content-primary">{cat.name}</span>
                      <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                        className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors">
                        <Pencil className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        <div className="px-4 py-4">
          <GlassCard size="regular" className="!p-0 overflow-hidden">
            <div className="overflow-x-auto density-compact">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredDocuments.length > 0 && selectedIds.size === filteredDocuments.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filteredDocuments.map(d => d.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                  />
                </th>
                <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Titlu</th>
                <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Categorie</th>
                <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Proiect</th>
                <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Tip fisier</th>
                <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Dimensiune</th>
                <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Data</th>
                <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Actiuni</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      icon={FileText}
                      title={selectedCategory !== null ? 'Nicio fisa in aceasta categorie' : 'Niciun document încă'}
                      body={
                        selectedCategory !== null
                          ? 'Schimba categoria sau adaugă un document atribuit categoriei selectate.'
                          : 'Încarcă primul document si — optional — atribuie-l unui proiect pentru a-l vedea in pagina proiectului.'
                      }
                      actionLabel="Încarcă document"
                      onAction={() => openModal()}
                    />
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-line last:border-b-0 hover:bg-surface-tertiary transition-colors"
                  >
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(doc.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) { next.add(doc.id); } else { next.delete(doc.id); }
                          setSelectedIds(next);
                        }}
                        className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
                        <span className="text-sm font-medium text-content-primary">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{doc.category_name}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary">{doc.project_name}</td>
                    <td className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">{doc.file_type}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary tabular-nums">{formatFileSize(doc.file_size)}</td>
                    <td className="px-4 py-3 text-xs text-content-secondary tabular-nums">{formatDate(doc.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          aria-label={`Descarcă ${doc.title}`}
                          className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
                        >
                          <Download className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          aria-label={`Șterge ${doc.title}`}
                          className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-status-red transition-colors"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              <TableFiller cols={7} count={Math.max(0, 18 - filteredDocuments.length)} />
            </tbody>
          </table>
            </div>
          </GlassCard>
        </div>

        {}
        <div className="border-t border-line">
          <DocumentsEnhancements documents={documents.map(d => ({
            id: d.id, name: d.title, category: d.category_name, file_type: d.file_type,
            file_path: d.file_path, created_at: d.created_at,
          }))} />
        </div>
      </div>

      {}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-surface-secondary border border-line shadow-lg px-4 py-2.5 flex items-center gap-3 z-30">
          <span className="text-xs text-content-primary font-medium">{selectedIds.size} selectate</span>
          <button onClick={handleBulkDelete} className="h-7 bg-status-red px-3 text-pm-2xs font-semibold text-surface-primary">Șterge selectia</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-pm-2xs text-content-muted hover:text-content-primary">Anulează</button>
        </div>
      )}

      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title={isEditing ? 'Editează document' : 'Adaugă document'}
        fields={formFields}
        onSubmit={handleSubmit}
        initialData={editingItem || {}}
        submitLabel={isEditing ? 'Actualizează' : 'Adaugă'}
      />
    </Page>
  );
}


function KpiMini({ icon: Icon, label, value, warn }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}
