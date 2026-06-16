








import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Mail, Phone, MapPin, Trash2, Send, ArrowRight, Paperclip,
  X, Loader2, MessageSquare, Image as ImageLucide, Briefcase,
  FileText, Download, File as FileIconLucide, Pencil,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import Page from '@/components/ui/Page';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { leadStatus } from '@/lib/statusTokens';
import { formatDateTimeRo } from '@/lib/format';
import { useMoney } from '@/store/settingsStore';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import FormModal from '@/components/FormModal';

interface LeadNote { id: number; content: string; created_by_name: string | null; created_at: string; }
interface Lead {
  id: number; client_name: string; contact_person: string | null; contact_email: string | null;
  contact_phone: string | null; product_interest: string | null; estimated_value: number;
  location: string | null; status: string; notes: string | null;
  last_contact_date: string | null; next_followup_date: string | null;
  assigned_to_name: string | null; converted_project_id: number | null; converted_project_name: string | null;
  created_at: string; updated_at: string; recent_notes: LeadNote[];
}
interface Attachment {
  id: number; lead_id: number; kind: string; filename: string | null;
  data: string; caption: string | null;
  created_by_user_id: number | null; created_by_name: string | null;
  created_at: string;
}

const LEAD_STATUS_OPTIONS = [
  { value: 'fara_contact',    label: 'Fără contact' },
  { value: 'decizie_client',  label: 'Decizie client' },
  { value: 'decizie_noastra', label: 'Decizie noastră' },
  { value: 'in_negocieri',    label: 'În negocieri' },
  { value: 'convertit',       label: 'Convertit' },
];






async function compressImage(file: File, maxEdge = 1024, quality = 0.7): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('Imaginea nu a putut fi citită'));
      im.src = url;
    });
    let { width, height } = img;
    if (width > maxEdge || height > maxEdge) {
      const scale = maxEdge / Math.max(width, height);
      width  = Math.round(width  * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponibil');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}






function pickFileIcon(att: { filename: string | null; data: string }): typeof FileIconLucide {
  const name = (att.filename || '').toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
  if (['pdf'].includes(ext)) return FileText;
  if (['doc', 'docx', 'rtf', 'odt', 'txt', 'md'].includes(ext)) return FileText;
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return FileText;
  if (['ppt', 'pptx', 'odp'].includes(ext)) return FileText;
  return FileIconLucide;
}

interface Props { user: User | null; leadId: number }

export default function LeadDetailPage({ user: _user, leadId }: Props) {
  const [, setLocation] = useLocation();
  const money = useMoney();
  const [lead, setLead] = useState<Lead | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [l, a] = await Promise.all([
        apiCommand<Lead>('get_sales_lead', { id: leadId }),
        apiCommand<Attachment[]>('list_lead_attachments', { lead_id: leadId }),
      ]);
      setLead(l);
      setAttachments(a);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la încărcare');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetch(); }, [fetch]);

  
  
  useEffect(() => {
    try {
      if (sessionStorage.getItem('promix_lead_edit') === String(leadId)) {
        sessionStorage.removeItem('promix_lead_edit');
        setEditOpen(true);
      }
    } catch {  }
  }, [leadId]);

  
  const addNote = async () => {
    if (!lead || !noteText.trim()) return;
    try {
      await apiCommand('add_sales_lead_note', { request: { lead_id: lead.id, content: noteText.trim() } });
      setNoteText('');
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  
  const changeStatus = async (newStatus: string) => {
    if (!lead) return;
    try {
      await apiCommand('update_sales_lead', { request: { id: lead.id, status: newStatus } });
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  
  const submitEdit = async (data: Record<string, any>) => {
    if (!lead) return;
    const num = data.estimated_value;
    await apiCommand('update_sales_lead', {
      request: {
        id: lead.id,
        client_name: String(data.client_name ?? '').trim(),
        contact_person: (data.contact_person ?? '').trim() || null,
        contact_phone: (data.contact_phone ?? '').trim() || null,
        contact_email: (data.contact_email ?? '').trim() || null,
        location: (data.location ?? '').trim() || null,
        product_interest: (data.product_interest ?? '').trim() || null,
        estimated_value: num === '' || num == null ? null : Number(num),
        next_followup_date: data.next_followup_date || null,
      },
    });
    setEditOpen(false);
    toast.success('Detaliile lead-ului au fost salvate');
    fetch();
  };

  
  
  
  
  
  
  
  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Citirea fișierului a eșuat'));
    };
    reader.onerror = () => reject(new Error('Citirea fișierului a eșuat'));
    reader.readAsDataURL(file);
  });

  const handleAttachmentFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !lead) return;
    setUploading(true);
    let imageCount = 0;
    let fileCount = 0;
    try {
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith('image/');
        const dataUrl = isImage ? await compressImage(file) : await fileToDataUrl(file);
        await apiCommand('add_lead_attachment', { request: {
          lead_id: lead.id,
          kind: isImage ? 'photo' : 'file',
          filename: file.name,
          data: dataUrl,
        }});
        if (isImage) imageCount += 1; else fileCount += 1;
      }
      if (imageCount && fileCount) {
        toast.success(`${imageCount + fileCount} fișiere încărcate`);
      } else if (imageCount) {
        toast.success(imageCount === 1 ? 'Imagine încărcată' : `${imageCount} imagini încărcate`);
      } else if (fileCount) {
        toast.success(fileCount === 1 ? 'Fișier încărcat' : `${fileCount} fișiere încărcate`);
      }
      fetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la upload');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (attachment: Attachment) => {
    const isImage = attachment.kind === 'photo' || attachment.data?.startsWith('data:image/');
    const label = isImage ? 'Șterge poza?' : 'Șterge fișierul?';
    if (!await confirmDialog({ title: label, danger: true })) return;
    try {
      await apiCommand('delete_lead_attachment', { id: attachment.id });
      fetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const downloadAttachment = (a: Attachment) => {
    try {
      const link = document.createElement('a');
      link.href = a.data;
      link.download = a.filename || `fisier-${a.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Nu pot descărca fișierul');
    }
  };

  
  const submitConvert = async (data: Record<string, unknown>) => {
    if (!lead) return;
    const name = String(data.project_name ?? '').trim();
    if (!name) throw new Error('Numele proiectului este obligatoriu');
    try {
      await apiCommand('convert_sales_lead', { request: { lead_id: lead.id, project_name: name } });
      toast.success('Lead convertit în proiect');
      setConvertOpen(false);
      setLocation('/sales-hub');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare conversie');
      throw err;
    }
  };

  
  const deleteLead = async () => {
    if (!lead) return;
    if (!await confirmDialog({ title: 'Șterge discuția?', body: 'Vor dispărea și toate notele și fișierele atașate.', danger: true })) return;
    try {
      await apiCommand('delete_sales_lead', { id: lead.id });
      toast.success('Discuție ștearsă');
      setLocation('/sales-hub');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  if (loading) {
    return (
      <Page>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      </Page>
    );
  }
  if (!lead) {
    return (
      <Page>
        <div className="flex flex-1 items-center justify-center text-content-muted">Discuție inexistentă.</div>
      </Page>
    );
  }

  const statusTok = leadStatus(lead.status);

  return (
    <Page>
      {}
      <PageHeader
        title={lead.client_name}
        subtitle={lead.product_interest || 'Fără produs specificat'}
        icon={<Briefcase className="h-4 w-4" />}
        onBack={() => setLocation('/sales-hub')}
      >
        <StatusBadge {...statusTok} size="sm" />
      </PageHeader>

      {}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {}
          <div className="lg:col-span-2 border-r border-line">

            {}
            <Section
              title="Contact"
              icon={Mail}
              actions={
                <button
                  onClick={() => setEditOpen(true)}
                  className="h-7 px-2.5 border border-line text-pm-2xs font-semibold text-content-secondary hover:bg-surface-tertiary hover:text-accent hover:border-accent/30 inline-flex items-center gap-1.5 transition-colors"
                  title="Editează detaliile lead-ului"
                >
                  <Pencil className="h-3 w-3" /> Editează
                </button>
              }
            >
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <Field label="Persoana de contact" value={lead.contact_person} />
                <Field label="Email" value={lead.contact_email} icon={Mail} href={lead.contact_email ? `mailto:${lead.contact_email}` : undefined} />
                <Field label="Telefon" value={lead.contact_phone} icon={Phone} href={lead.contact_phone ? `tel:${lead.contact_phone}` : undefined} />
                <Field label="Locație" value={lead.location} icon={MapPin} />
                <Field label="Valoare estimată" value={lead.estimated_value > 0 ? money(lead.estimated_value, 'EUR', 0) : null} />
                <Field label="Următor follow-up" value={lead.next_followup_date} />
                <Field label="Asignat" value={lead.assigned_to_name} />
                <Field label="Creat" value={formatDateTimeRo(lead.created_at)} />
              </dl>
            </Section>

            {}
            <Section title="Status & acțiuni" icon={ArrowRight}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-pm-2xs uppercase tracking-wide text-content-muted">Status:</span>
                  <select
                    value={lead.status}
                    onChange={e => changeStatus(e.target.value)}
                    className="h-8 border border-line bg-surface-primary px-2 text-pm-xs text-content-primary"
                  >
                    {LEAD_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {lead.status !== 'convertit' && (
                  <Button size="sm" onClick={() => setConvertOpen(true)}>
                    <ArrowRight className="h-3.5 w-3.5" /> Trece în execuție
                  </Button>
                )}
                {

}
                <button
                  onClick={deleteLead}
                  className="ml-auto h-8 px-3 border border-line text-pm-xs text-content-muted hover:bg-status-red/10 hover:text-status-red hover:border-status-red/30 transition-colors"
                  title="Șterge discuția"
                >
                  <Trash2 className="h-3.5 w-3.5 inline mr-1" /> Șterge
                </button>
              </div>
              {lead.converted_project_name && (
                <p className="mt-3 text-pm-xs text-status-green">
                  ✓ Convertit în proiectul <strong>{lead.converted_project_name}</strong>
                </p>
              )}
            </Section>

            {}
            <Section
              title="Poze și atașamente"
              icon={ImageLucide}
              actions={
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-8 px-3 bg-accent text-pm-xs font-semibold text-surface-primary hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                  Adaugă fișiere
                </button>
              }
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => { void handleAttachmentFiles(e.target.files); e.target.value = ''; }}
              />
              {attachments.length === 0 ? (
                <div className="border border-dashed border-line/80 bg-surface-primary/40 py-10 flex flex-col items-center justify-center text-content-muted">
                  <Paperclip className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-pm-sm">Niciun fișier încă</p>
                  <p className="text-pm-2xs mt-1">Poze, PDF, Word, oferte, schițe</p>
                </div>
              ) : (() => {
                
                
                
                
                
                const isImageAttachment = (a: Attachment) =>
                  a.kind === 'photo' || a.data?.startsWith('data:image/');
                const images = attachments.filter(isImageAttachment);
                const files  = attachments.filter(a => !isImageAttachment(a));
                return (
                  <div className="space-y-3">
                    {images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {images.map(a => (
                          <div key={a.id} className="relative group border border-line/60 bg-surface-primary overflow-hidden">
                            <button
                              onClick={() => setPreviewImage(a.data)}
                              title={a.filename || 'Vezi mărit'}
                              className="block w-full aspect-square overflow-hidden hover:opacity-90"
                            >
                              <img src={a.data} alt={a.filename ?? ''} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            </button>
                            <button
                              onClick={() => removeAttachment(a)}
                              title="Șterge"
                              className="absolute top-1 right-1 h-7 w-7 rounded-full bg-status-red/90 text-white opacity-0 group-hover:opacity-100 hover:bg-status-red flex items-center justify-center transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            {(a.filename || a.created_by_name) && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white px-2 py-1 text-pm-2xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                {a.filename || `de ${a.created_by_name}`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {files.length > 0 && (
                      <ul className="divide-y divide-line/40 border border-line/60 bg-surface-primary">
                        {files.map(a => {
                          const FileGlyph = pickFileIcon(a);
                          return (
                            <li key={a.id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-tertiary/30 transition-colors">
                              <FileGlyph className="h-5 w-5 shrink-0 text-content-muted" />
                              <div className="flex-1 min-w-0">
                                <p className="text-pm-sm text-content-primary truncate" title={a.filename ?? ''}>
                                  {a.filename || `fișier-${a.id}`}
                                </p>
                                <p className="text-pm-2xs text-content-muted">
                                  {a.created_by_name ? `Adăugat de ${a.created_by_name}` : 'Atașament'}
                                  {' · '}{formatDateTimeRo(a.created_at)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => downloadAttachment(a)}
                                title="Descarcă"
                                className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
                                aria-label="Descarcă"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeAttachment(a)}
                                title="Șterge"
                                className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-status-red transition-colors"
                                aria-label="Șterge"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </Section>

            {}
            {lead.notes && (
              <Section title="Note inițiale" icon={MessageSquare}>
                <p className="text-pm-sm text-content-secondary whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
              </Section>
            )}
          </div>

          {}
          <div className="lg:col-span-1">
            <Section title={`Comentarii (${lead.recent_notes.length})`} icon={MessageSquare}>
              <div className="flex gap-1.5 mb-3">
                <input
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addNote(); } }}
                  placeholder="Adaugă o notă..."
                  className="flex-1 h-9 border border-line bg-surface-primary px-3 text-pm-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60"
                />
                <Button size="sm" onClick={addNote} disabled={!noteText.trim()} aria-label="Trimite nota">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
              {lead.recent_notes.length === 0 ? (
                <p className="text-pm-xs text-content-muted italic py-4 text-center">Niciun comentariu încă.</p>
              ) : (
                <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                  {lead.recent_notes.map(n => (
                    <div key={n.id} className="bg-surface-primary border border-line/60 px-3 py-2">
                      <p className="text-pm-sm text-content-primary whitespace-pre-wrap">{n.content}</p>
                      <p className="text-pm-2xs text-content-muted mt-1">
                        {n.created_by_name || 'Anonim'} · {formatDateTimeRo(n.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>

      {}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-surface-primary/20 text-white hover:bg-surface-primary/30 flex items-center justify-center"
            aria-label="Închide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {}
      <FormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editează detaliile lead-ului"
        fields={[
          { name: 'client_name', label: 'Nume client / firmă', type: 'text', required: true },
          { name: 'contact_person', label: 'Persoană de contact', type: 'text', placeholder: 'Nume și prenume' },
          { name: 'contact_phone', label: 'Telefon', type: 'tel' },
          { name: 'contact_email', label: 'Email', type: 'email' },
          { name: 'location', label: 'Locație', type: 'text' },
          { name: 'product_interest', label: 'Produs / interes', type: 'text' },
          { name: 'estimated_value', label: 'Valoare estimată (EUR)', type: 'number', min: 0 },
          { name: 'next_followup_date', label: 'Următor follow-up', type: 'date' },
        ]}
        initialData={{
          client_name: lead.client_name,
          contact_person: lead.contact_person ?? '',
          contact_phone: lead.contact_phone ?? '',
          contact_email: lead.contact_email ?? '',
          location: lead.location ?? '',
          product_interest: lead.product_interest ?? '',
          estimated_value: lead.estimated_value || '',
          next_followup_date: lead.next_followup_date ?? '',
        }}
        onSubmit={submitEdit}
        submitLabel="Salvează"
      />

      {}
      <FormModal
        isOpen={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convertire lead → proiect"
        fields={[{ name: 'project_name', label: 'Nume proiect', type: 'text', required: true }]}
        initialData={{ project_name: `Statie ${lead.client_name}` }}
        onSubmit={submitConvert}
        submitLabel="Convertește"
      />
    </Page>
  );
}





function Section({
  title, icon: Icon, actions, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line">
      <header className="flex items-center gap-2 px-5 py-2.5 bg-surface-secondary border-b border-line/60">
        <Icon className="h-3.5 w-3.5 text-content-muted shrink-0" />
        <h2 className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted flex-1">{title}</h2>
        {actions}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Field({
  label, value, icon: Icon, href,
}: {
  label: string; value: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  return (
    <div>
      <dt className="text-pm-2xs uppercase tracking-wide text-content-muted">{label}</dt>
      <dd className="text-pm-sm text-content-primary mt-0.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-content-muted shrink-0" />}
        {value
          ? (href
              ? <a href={href} className="hover:text-accent">{value}</a>
              : <span>{value}</span>
            )
          : <span className="text-content-muted italic">—</span>}
      </dd>
    </div>
  );
}
