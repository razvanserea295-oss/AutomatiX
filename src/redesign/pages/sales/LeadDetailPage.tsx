

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Mail, Phone, MapPin, Trash2, Send, ArrowRight, Paperclip,
  X, Loader2, Image as ImageLucide, Briefcase,
  FileText, Download, File as FileIconLucide, Pencil,
  CalendarClock, Coins, User as UserIcon, Megaphone, Plus, ArrowLeft,
} from '@/icons';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import Page from '@/redesign/ui/Page';
import { PageChrome, DashboardLayout } from '@/app-ui';
import PageLoadingShell from '@/redesign/ui/PageLoadingShell';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import Card, { CardBody, CardHeader } from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import StatusBadge from '@/redesign/ui/StatusBadge';
import SectionHeader from '@/redesign/ui/SectionHeader';
import EmptyState from '@/redesign/ui/EmptyState';
import { vtName } from '@/redesign/lib/viewTransition';
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

  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);
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

  const saveUpdate = async () => {
    if (!lead || !updateText.trim() || savingUpdate) return;
    setSavingUpdate(true);
    try {
      await apiCommand('add_sales_lead_note', { request: { lead_id: lead.id, content: updateText.trim() } });
      setUpdateText('');
      setUpdateOpen(false);
      toast.success('Update înregistrat');
      await fetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    } finally {
      setSavingUpdate(false);
    }
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
    return <PageLoadingShell />;
  }
  if (!lead) {
    return (
      <DashboardLayout
        chrome={(
          <PageChrome
            secondaryActions={(
              <Button variant="ghost" size="md" onClick={() => setLocation('/sales-hub')}>
                <ArrowLeft className="h-4 w-4" /> Înapoi
              </Button>
            )}
          />
        )}
      >
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Briefcase}
            title="Discuție inexistentă"
            description="Lead-ul căutat nu mai există sau a fost șters."
            action={
              <Button size="sm" variant="secondary" onClick={() => setLocation('/sales-hub')}>
                <ArrowRight className="h-3.5 w-3.5" /> Înapoi la vânzări
              </Button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  const statusTok = leadStatus(lead.status);

  const isImageAttachment = (a: Attachment) =>
    a.kind === 'photo' || a.data?.startsWith('data:image/');
  const images = attachments.filter(isImageAttachment);
  const files  = attachments.filter(a => !isImageAttachment(a));

  return (
    <DashboardLayout
        chrome={(
          <PageChrome
            secondaryActions={(
              <Button variant="ghost" size="md" onClick={() => setLocation('/sales-hub')}>
                <ArrowLeft className="h-4 w-4" /> Înapoi
              </Button>
            )}
            actions={(
              <>
                <StatusBadge {...statusTok} size="sm" />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => { setUpdateOpen(true); setUpdateText(''); }}
                  className="border-accent/40 bg-accent-muted text-accent hover:bg-accent hover:text-[var(--color-on-accent)]"
                  title="Înregistrează un update / noutate pe lead — resetează avertismentul „fără update”"
                >
                  <Megaphone className="h-3.5 w-3.5" /> Update
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setEditOpen(true)}
                  className="hover:text-accent hover:border-accent/30"
                  title="Editează detaliile lead-ului"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editează
                </Button>
                {lead.status !== 'convertit' && (
                  <Button size="md" onClick={() => setConvertOpen(true)}>
                    <ArrowRight className="h-3.5 w-3.5" /> Trece în execuție
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="md"
                  onClick={deleteLead}
                  className="text-content-muted hover:bg-status-red/10 hover:text-status-red hover:border-status-red/30"
                  title="Șterge discuția"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Șterge
                </Button>
              </>
            )}
          />
        )}
      bodyClassName="relative"
      contentClassName="max-w-[var(--page-max-wide)] mx-auto w-full"
    >

        <Page.Kpis cols={4} className="shrink-0">
          <KpiCard
            label="Status"
            value={statusTok.label}
            icon={ArrowRight}
            vtName={vtName('lead', lead.id)}
          />
          <KpiCard
            label="Valoare estimată"
            value={lead.estimated_value > 0 ? money(lead.estimated_value, 'EUR', 0) : '—'}
            icon={Coins}
            hint={lead.next_followup_date ? `Follow-up: ${lead.next_followup_date}` : undefined}
          />
          <KpiCard
            label="Atașamente"
            value={attachments.length}
            icon={Paperclip}
            hint={attachments.length > 0 ? `${images.length} poze · ${files.length} fișiere` : undefined}
          />
          <KpiCard
            label="Update-uri"
            value={lead.recent_notes.length}
            icon={Megaphone}
            hint={lead.assigned_to_name ? `Asignat: ${lead.assigned_to_name}` : undefined}
          />
        </Page.Kpis>

        {
}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {

}
          <div key={`main-${lead.id}`} className="lg:col-span-8 space-y-4 stagger-in">
            <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                    <ImageLucide className="h-4 w-4" />
                  </span>
                  Poze și atașamente
                </span>
              }
              subtitle={attachments.length > 0 ? `${images.length} poze · ${files.length} fișiere` : 'Poze, PDF, Word, oferte, schițe'}
              actions={
                <Button
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                  Adaugă fișiere
                </Button>
              }
            />
            <CardBody>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => { void handleAttachmentFiles(e.target.files); e.target.value = ''; }}
              />
              {attachments.length === 0 ? (
                <EmptyState
                  icon={Paperclip}
                  title="Niciun fișier încă"
                  description="Poze, PDF, Word, oferte, schițe — folosește butonul Adaugă fișiere."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Paperclip className="h-3.5 w-3.5" /> Adaugă fișiere
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {images.length > 0 && (
                    <div key={`imgs-${images.length}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 stagger-in">
                      {images.map(a => (
                        <div key={a.id} className="relative group rounded-xl border border-line/60 bg-surface-primary overflow-hidden surface-lift transition-smooth duration-150">
                          <button
                            onClick={() => setPreviewImage(a.data)}
                            title={a.filename || 'Vezi mărit'}
                            className="block w-full aspect-square overflow-hidden hover:opacity-90 transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                          >
                            <img src={a.data} alt={a.filename ?? ''} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                          </button>
                          <button
                            onClick={() => removeAttachment(a)}
                            title="Șterge"
                            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-status-red/90 text-white opacity-0 group-hover:opacity-100 hover:bg-status-red flex items-center justify-center transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:opacity-100 focus-visible:shadow-[var(--ring-soft)]"
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
                    <ul key={`files-${files.length}`} className="divide-y divide-line/40 rounded-xl border border-line/60 bg-surface-primary overflow-hidden stagger-in">
                      {files.map(a => {
                        const FileGlyph = pickFileIcon(a);
                        return (
                          <li key={a.id} className="group flex items-center gap-3 px-3 py-2.5 hover:bg-surface-tertiary/40 transition-colors">
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
                            <IconButton
                              intent="primary"
                              size="sm"
                              onClick={() => downloadAttachment(a)}
                              title="Descarcă"
                              aria-label="Descarcă"
                              className="opacity-70 group-hover:opacity-100"
                            >
                              <Download className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              intent="danger"
                              size="sm"
                              onClick={() => removeAttachment(a)}
                              title="Șterge"
                              aria-label="Șterge"
                              className="opacity-70 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </CardBody>
            </Card>
            {lead.notes && (
              <Card>
                <CardBody padding="lg">
                  <SectionHeader icon={FileText} title="Notă inițială" />
                  <p className="text-pm-sm text-content-secondary whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                </CardBody>
              </Card>
            )}

            {
}
            <Card className="border-l-2 !border-l-accent/50">
              <CardBody padding="lg">
                <SectionHeader
                  icon={Megaphone}
                  title={`Update-uri / Noutăți (${lead.recent_notes.length})`}
                  actions={!updateOpen && (
                    <Button size="sm" onClick={() => { setUpdateOpen(true); setUpdateText(''); }}>
                      <Plus className="h-3.5 w-3.5" /> Înregistrează update
                    </Button>
                  )}
                />
                {updateOpen && (
                  <div className="mb-4 rounded-xl border border-accent/30 bg-accent-muted/40 p-3 anim-pop">
                    <textarea
                      value={updateText}
                      autoFocus
                      rows={3}
                      onChange={e => setUpdateText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void saveUpdate(); }
                        if (e.key === 'Escape') { setUpdateOpen(false); setUpdateText(''); }
                      }}
                      placeholder="Noutăți pe lead: ce s-a discutat, în ce stadiu e oferta, următorii pași…"
                      className="w-full rounded-xl border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)] resize-y transition-smooth duration-150"
                    />
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setUpdateOpen(false); setUpdateText(''); }}
                      >
                        Anulează
                      </Button>
                      <Button size="sm" onClick={saveUpdate} disabled={!updateText.trim() || savingUpdate}>
                        {savingUpdate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Salvează update
                      </Button>
                    </div>
                  </div>
                )}

                {lead.recent_notes.length === 0 ? (
                  <p className="text-pm-xs text-content-muted italic py-4 text-center">
                    Niciun update încă — apasă „Înregistrează update” când ai noutăți.
                  </p>
                ) : (

                  <div key={`feed-${lead.id}-${lead.recent_notes.length}`} className="space-y-2 stagger-in">
                    {lead.recent_notes.map(n => (
                      <div key={n.id} className="rounded-xl bg-surface-primary border border-line/60 px-3 py-2.5">
                        <p className="text-pm-sm text-content-primary whitespace-pre-wrap">{n.content}</p>
                        <p className="text-pm-2xs text-content-muted mt-1">
                          {n.created_by_name || 'Anonim'} · {formatDateTimeRo(n.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-4 pt-4 border-t border-line/40">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addNote(); } }}
                    placeholder="Notă rapidă…"
                    className="flex-1 min-w-0 h-9 rounded-xl border border-line/70 bg-surface-secondary/40 px-3 text-pm-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)] transition-smooth duration-150"
                  />
                  <Button size="md" onClick={addNote} disabled={!noteText.trim()} aria-label="Trimite nota">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {
}
          <div key={`rail-${lead.id}`} className="lg:col-span-4 space-y-4 stagger-in">
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4" />
                    </span>
                    Contact
                  </span>
                }
                actions={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                    className="hover:text-accent hover:border-accent/30"
                    title="Editează detaliile lead-ului"
                  >
                    <Pencil className="h-3 w-3" /> Editează
                  </Button>
                }
              />
              <CardBody>
                <dl key={`contact-${lead.id}`} className="space-y-3 stagger-in">
                  <Field label="Persoana de contact" value={lead.contact_person} icon={UserIcon} />
                  <Field label="Email" value={lead.contact_email} icon={Mail} href={lead.contact_email ? `mailto:${lead.contact_email}` : undefined} />
                  <Field label="Telefon" value={lead.contact_phone} icon={Phone} href={lead.contact_phone ? `tel:${lead.contact_phone}` : undefined} />
                  <Field label="Locație" value={lead.location} icon={MapPin} />
                  <Field label="Valoare estimată" value={lead.estimated_value > 0 ? money(lead.estimated_value, 'EUR', 0) : null} icon={Coins} />
                  <Field label="Următor follow-up" value={lead.next_followup_date} icon={CalendarClock} />
                  <Field label="Asignat" value={lead.assigned_to_name} icon={UserIcon} />
                  <Field label="Creat" value={formatDateTimeRo(lead.created_at)} icon={CalendarClock} />
                </dl>
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                    Status & acțiuni
                  </span>
                }
              />
              <CardBody>
                <div className="space-y-3">
                  <div>
                    <span className="block text-pm-2xs uppercase tracking-wide text-content-muted mb-1.5">Status</span>
                    <select
                      value={lead.status}
                      onChange={e => changeStatus(e.target.value)}
                      className="w-full h-9 rounded-xl border border-line/70 bg-surface-secondary/40 px-3 text-pm-sm text-content-primary focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)] transition-smooth duration-150"
                    >
                      {LEAD_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  {lead.status !== 'convertit' && (
                    <Button size="md" block onClick={() => setConvertOpen(true)}>
                      <ArrowRight className="h-3.5 w-3.5" /> Trece în execuție
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="md"
                    block
                    onClick={deleteLead}
                    className="text-content-muted hover:bg-status-red/10 hover:text-status-red hover:border-status-red/30"
                    title="Șterge discuția"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Șterge discuția
                  </Button>
                  {lead.converted_project_name && (
                    <p className="text-pm-xs text-status-green">
                      ✓ Convertit în proiectul <strong>{lead.converted_project_name}</strong>
                    </p>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        </div>{}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-surface-primary/20 text-white hover:bg-surface-primary/30 flex items-center justify-center transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            aria-label="Închide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
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
          { name: 'estimated_value', label: 'Valoare estimată (lei)', type: 'number', min: 0 },
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
      <FormModal
        isOpen={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convertire lead → proiect"
        fields={[{ name: 'project_name', label: 'Nume proiect', type: 'text', required: true }]}
        initialData={{ project_name: `Statie ${lead.client_name}` }}
        onSubmit={submitConvert}
        submitLabel="Convertește"
      />
    </DashboardLayout>
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
      <dd className="text-pm-sm text-content-primary mt-1 flex items-center gap-1.5 min-w-0">
        {Icon && <Icon className="h-3 w-3 text-content-muted shrink-0" />}
        {value
          ? (href
              ? <a href={href} className="truncate hover:text-accent transition-smooth duration-150 rounded-sm focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">{value}</a>
              : <span className="truncate">{value}</span>
            )
          : <span className="text-content-muted italic">—</span>}
      </dd>
    </div>
  );
}
