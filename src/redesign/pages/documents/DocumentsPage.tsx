






























import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText, Download, Trash2, Upload, GripVertical, Plus, Pencil, FolderOpen,
  FolderKanban, Filter, X, Check, AlertTriangle,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { useDashboardStore } from '@/store/dashboardStore';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { useSort } from '@/hooks/useSort';
import { formatDateRo } from '@/lib/format';
import DocumentsEnhancements from '@/pages/documents/DocumentsEnhancements';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';

import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import Page from '@/redesign/ui/Page';
import KpiCard from '@/redesign/ui/KpiCard';
import FilterBar from '@/redesign/ui/FilterBar';
import TableFiller from '@/redesign/ui/TableFiller';
import SortableTh from '@/redesign/ui/SortableTh';
import SectionHeader from '@/redesign/ui/SectionHeader';
import { GlassCard, EmptyState, Skeleton } from '@/redesign/ui';
import { filterToggleCls } from '@/redesign/ui/filterControls';





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

  
  
  type DocSortKey = 'title' | 'category_name' | 'project_name' | 'file_type' | 'file_size' | 'created_at';
  const { sorted: sortedDocuments, sort, toggle } = useSort<Document, DocSortKey>(
    filteredDocuments,
    (row, key) => {
      if (key === 'file_size') return row.file_size ?? 0;
      if (key === 'created_at') return row.created_at ? new Date(row.created_at) : null;
      return (row[key] as string | null) ?? '';
    },
  );

  
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

  
  if (loading) {
    return (
      <Page fit>
        <Page.Body fit>
          {}
          <div className="enter-fade shrink-0 pb-3.5 border-b border-line/60">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton width={44} height={44} rounded="lg" />
                <div className="space-y-2">
                  <Skeleton width={72} height={10} />
                  <Skeleton width={150} height={20} />
                </div>
              </div>
              <Skeleton width={300} height={40} rounded="lg" />
              <Skeleton width={150} height={36} rounded="lg" />
            </div>
          </div>
          {}
          <div className="enter-fade shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4" style={{ animationDelay: '60ms' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface-card bg-surface-primary rounded-2xl border border-line px-5 py-4 min-h-[96px] space-y-3">
                <Skeleton width={88} height={10} />
                <Skeleton width={56} height={26} />
              </div>
            ))}
          </div>
          {}
          <div className="enter-fade flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-5" style={{ animationDelay: '120ms' }}>
            <div className="xl:col-span-4 min-h-0">
              <GlassCard size="regular" className="h-full min-h-80" />
            </div>
            <div className="xl:col-span-8 min-h-0">
              <GlassCard size="regular" className="!p-0 overflow-hidden h-full">
                <div className="px-5 py-4 border-b border-line/40"><Skeleton height={20} width={160} /></div>
                <div className="px-3 py-3 space-y-2">
                  {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} height={36} />)}
                </div>
              </GlassCard>
            </div>
          </div>
        </Page.Body>
      </Page>
    );
  }

  
  if (error) {
    return (
      <Page fit>
        <Page.Body fit>
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={AlertTriangle}
              title="Eroare la încărcarea documentelor"
              description={error}
              action={
                <Button size="sm" variant="secondary" onClick={() => void fetchData()}>
                  Reîncearcă
                </Button>
              }
            />
          </div>
        </Page.Body>
      </Page>
    );
  }

  
  return (
    <Page fit>
      <Page.Body fit>

        {



}
        <div className="enter-up shrink-0 pb-3.5 border-b border-line/60" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-accent-muted flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-accent" aria-hidden />
              </span>
              <div className="min-w-0">
                {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
                <h1 className="text-pm-2xl font-semibold text-content-primary leading-tight truncate">Documente</h1>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:ml-auto">
              <div className="hidden sm:block w-[260px] lg:w-[320px]">
                <FilterBar search={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Caută titlu, descriere, categorie..." />
              </div>
              <Button size="md" onClick={() => openModal()} aria-label="Adaugă document">
                <Upload className="h-4 w-4" aria-hidden /> Adaugă document
              </Button>
            </div>
          </div>
          {}
          <div className="sm:hidden mt-3">
            <FilterBar search={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Caută titlu, descriere, categorie..." />
          </div>
        </div>

        {

}
        <div className="enter-up shrink-0" style={{ animationDelay: '70ms' }}>
          <Page.Kpis cols={4}>
            <KpiCard label="Total documente" value={docStats.total}                                       icon={FileText}     iconColor="text-accent" />
            <KpiCard label="Categorii"        value={docStats.catCount}                                    icon={FolderOpen}   iconColor="text-status-blue" />
            <KpiCard label="Cu proiect"       value={documents.filter(d => d.project_id != null).length}   icon={FolderKanban} iconColor="text-status-teal" />
            <KpiCard label="Afișate"          value={filteredDocuments.length}                             icon={Filter}       iconColor="text-status-green" hint={selectedCategory !== null || searchQuery ? 'din filtrul curent' : 'toate documentele'} />
          </Page.Kpis>
        </div>

        {


}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 -mx-1 px-1">

        {


}
        <div className="min-h-[68vh] grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">

          {}
          <aside className="xl:col-span-4 enter-up min-h-0 flex" style={{ animationDelay: '140ms' }}>
            <GlassCard size="regular" className="!p-0 overflow-hidden flex flex-col min-h-0 w-full">
              {}
              <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-line">
                <h2 className="text-pm-sm font-semibold text-content-primary">Categorii</h2>
                <button
                  type="button"
                  onClick={() => setShowCatManager(!showCatManager)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-pm-2xs font-semibold transition-colors ${
                    showCatManager ? 'bg-accent-muted text-accent' : 'text-content-muted hover:bg-surface-tertiary hover:text-accent'
                  }`}
                  title="Gestioneaza categorii"
                >
                  <Pencil className="h-3 w-3" aria-hidden /> Gestionează
                </button>
              </div>

              {}
              <div className="flex-1 min-h-0 p-3 space-y-1.5 overflow-y-auto">
                <button
                  type="button"
                  aria-label="Toate categoriile"
                  onClick={() => setSelectedCategory(null)}
                  className={`${filterToggleCls(selectedCategory === null)} w-full !justify-start`}
                >
                  <Filter className="h-3.5 w-3.5 opacity-60" aria-hidden />
                  Toate
                  <span className="ml-auto text-pm-2xs tabular-nums opacity-70">{documents.length}</span>
                </button>
                {categories.map((cat) => {
                  const count = documents.filter(d => d.category_id === cat.id).length;
                  return (
                    <div key={cat.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        draggable
                        aria-label={`Filtrează: ${cat.name}`}
                        onClick={() => setSelectedCategory(cat.id)}
                        onDragStart={() => handleCatDragStart(cat.id)}
                        onDragOver={(e) => handleCatDragOver(e, cat.id)}
                        onDrop={handleCatDrop}
                        className={`group ${filterToggleCls(selectedCategory === cat.id)} flex-1 min-w-0 !justify-start cursor-grab active:cursor-grabbing`}
                      >
                        <GripVertical className="h-3.5 w-3.5 opacity-40 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:opacity-70 motion-reduce:transform-none" aria-hidden />
                        <span className="truncate">{cat.name}</span>
                        <span className="ml-auto text-pm-2xs tabular-nums opacity-70 shrink-0">{count}</span>
                      </button>
                      <button
                        type="button"
                        title={`Adaugă document in ${cat.name}`}
                        onClick={() => { setSelectedCategory(cat.id); openModal(); }}
                        className={`group h-10 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border transition-colors ${
                          selectedCategory === cat.id
                            ? 'bg-accent-muted text-accent border-accent/40 hover:bg-accent hover:text-[var(--color-on-accent)]'
                            : 'bg-surface-primary text-content-muted border-line hover:bg-surface-tertiary hover:text-accent'
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none" aria-hidden />
                      </button>
                    </div>
                  );
                })}
                {categories.length === 0 && (
                  <p className="px-1 py-2 text-pm-xs text-content-muted">
                    Nicio categorie. Adaugă una din „Gestionează”.
                  </p>
                )}
              </div>

              {
}
              {showCatManager && (
                <div className="enter-fade shrink-0 border-t border-line bg-surface-secondary/60 p-3 space-y-2 max-h-[40vh] overflow-y-auto">
                  <h3 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Gestionare categorii</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                      placeholder="Categorie noua..."
                      className="flex-1 min-w-0 h-9 border border-line bg-surface-primary rounded-lg px-2.5 text-pm-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)]"
                    />
                    <Button size="sm" onClick={handleAddCategory}>
                      <Plus className="h-3 w-3" /> Adaugă
                    </Button>
                  </div>
                  <div className="space-y-0">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-tertiary">
                        <GripVertical className="h-3 w-3 text-content-muted cursor-grab shrink-0" aria-hidden />
                        {editingCatId === cat.id ? (
                          <>
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCategory(cat.id); }}
                              className="flex-1 min-w-0 h-8 border border-line bg-surface-primary rounded-lg px-2 text-pm-sm text-content-primary focus:outline-none focus:border-accent"
                              autoFocus
                            />
                            <IconButton intent="success" size="sm" onClick={() => handleUpdateCategory(cat.id)} title="Salvează" aria-label="Salvează">
                              <Check aria-hidden />
                            </IconButton>
                            <IconButton intent="default" size="sm" onClick={() => setEditingCatId(null)} title="Anulează" aria-label="Anulează">
                              <X aria-hidden />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 min-w-0 truncate text-pm-sm text-content-primary">{cat.name}</span>
                            <IconButton intent="primary" size="sm" onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }} title="Redenumește" aria-label={`Redenumește ${cat.name}`}>
                              <Pencil aria-hidden />
                            </IconButton>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </aside>

          {}
          <section className="xl:col-span-8 enter-up min-w-0 min-h-0 flex" style={{ animationDelay: '200ms' }}>
            <GlassCard size="regular" className="!p-0 overflow-hidden flex flex-col min-h-0 w-full">
              <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line/40">
                <h2 className="text-pm-md font-semibold text-content-primary">Documente</h2>
                <p className="text-pm-xs text-content-muted shrink-0">
                  {sortedDocuments.length} {sortedDocuments.length === 1 ? 'document' : 'documente'}
                  {selectedCategory !== null ? ' în categorie' : ''}{searchQuery ? ` pentru „${searchQuery}"` : ''}
                </p>
              </div>
              <div
                style={{ ['--table-row-height' as never]: '40px' }}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-auto table-fill px-2 density-compact"
              >
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="sticky top-0 z-10 bg-surface-secondary shadow-[inset_0_-1px_0_var(--color-border)]">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={sortedDocuments.length > 0 && selectedIds.size === sortedDocuments.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(sortedDocuments.map(d => d.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                          aria-label="Selectează toate"
                        />
                      </th>
                      <SortableTh sortKey="title"         sort={sort} onSort={toggle}>Titlu</SortableTh>
                      <SortableTh sortKey="category_name" sort={sort} onSort={toggle}>Categorie</SortableTh>
                      <SortableTh sortKey="project_name"  sort={sort} onSort={toggle}>Proiect</SortableTh>
                      <SortableTh sortKey="file_type"     sort={sort} onSort={toggle}>Tip fisier</SortableTh>
                      <SortableTh sortKey="file_size"     sort={sort} onSort={toggle} align="right">Dimensiune</SortableTh>
                      <SortableTh sortKey="created_at"    sort={sort} onSort={toggle} align="right">Data</SortableTh>
                      <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted text-right">Actiuni</th>
                    </tr>
                  </thead>
                  <tbody key={`${selectedCategory ?? 'all'}|${searchQuery}`} className="stagger-in">
                    {sortedDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <EmptyState
                            icon={FileText}
                            title={selectedCategory !== null ? 'Nicio fisa in aceasta categorie' : 'Niciun document încă'}
                            description={
                              selectedCategory !== null
                                ? 'Schimba categoria sau adaugă un document atribuit categoriei selectate.'
                                : 'Încarcă primul document si — optional — atribuie-l unui proiect pentru a-l vedea in pagina proiectului.'
                            }
                            action={
                              <Button size="sm" onClick={() => openModal()}>
                                <Upload className="h-3.5 w-3.5" aria-hidden /> Încarcă document
                              </Button>
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      sortedDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className="group border-b border-line last:border-b-0 hover:bg-surface-tertiary/40 transition-colors"
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
                              aria-label={`Selectează ${doc.title}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
                              <span className="text-sm font-medium text-content-primary truncate" title={doc.title}>{doc.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-content-secondary truncate" title={doc.category_name}>{doc.category_name}</td>
                          <td className="px-4 py-3 text-xs text-content-secondary truncate" title={doc.project_name ?? undefined}>
                            {doc.project_name ?? <span className="text-content-muted">—</span>}
                          </td>
                          <td className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">{doc.file_type}</td>
                          <td className="px-4 py-3 text-xs text-content-secondary tabular-nums text-right">{formatFileSize(doc.file_size)}</td>
                          <td className="px-4 py-3 text-xs text-content-secondary tabular-nums text-right">{formatDate(doc.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end opacity-70 group-hover:opacity-100 transition-opacity motion-reduce:transition-none">
                              <IconButton
                                intent="primary"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                                aria-label={`Descarcă ${doc.title}`}
                              >
                                <Download aria-hidden />
                              </IconButton>
                              <IconButton
                                intent="danger"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
                                aria-label={`Șterge ${doc.title}`}
                              >
                                <Trash2 aria-hidden />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                    <TableFiller cols={8} count={Math.max(0, 18 - sortedDocuments.length)} />
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </section>
        </div>

        {

}
        <section className="enter-up shrink-0" style={{ animationDelay: '260ms' }}>
          <SectionHeader
            icon={FolderOpen}
            eyebrow="Instrumente"
            title="Tools avansate"
            meta="Versiuni, share-link, OCR, auto-categorizare, ZIP, remindere și watermark"
          />
          <DocumentsEnhancements documents={documents.map(d => ({
            id: d.id, name: d.title, category: d.category_name, file_type: d.file_type,
            file_path: d.file_path, created_at: d.created_at,
          }))} />
        </section>

        </div>{}
      </Page.Body>

      {}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-surface-elevated border border-line rounded-xl shadow-[var(--elevation-3)] px-4 py-2.5 flex items-center gap-3 z-30">
          <span className="text-xs text-content-primary font-medium">{selectedIds.size} selectate</span>
          <Button variant="danger" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Șterge selectia
          </Button>
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

