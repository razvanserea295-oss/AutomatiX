import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Inbox, Send as SendIcon, FileText, Trash2, RefreshCw, Star, Paperclip, ChevronLeft, Loader2, PenSquare, X, Settings as SettingsIcon, Wrench } from 'lucide-react';
import { Link } from 'wouter';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import type { User } from '@/core/types';
import EmptyState from '@/components/EmptyState';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import EmailEnhancements from '@/pages/email/EmailEnhancements';

interface EmailMsg { id: number; thread_id: number | null; from_address: string; from_name: string | null; subject: string; snippet: string; date: string; is_read: boolean; is_starred: boolean; has_attachments: boolean; folder: string; }
interface EmailFull { id: number; from_address: string; from_name: string | null; to_addresses: string; cc_addresses: string | null; subject: string; body_html: string | null; body_text: string | null; date: string; is_read: boolean; is_starred: boolean; has_attachments: boolean; attachments: Att[]; folder: string; }
interface Att { id: number; filename: string; content_type: string; size_bytes: number; }
interface Folder { name: string; message_count: number; unread_count: number; }
interface EmailAccount { id: number; email_address: string; display_name: string; imap_host: string; smtp_host: string; last_sync_at: string | null; enabled: boolean; password_configured: boolean; }

const folderIcons: Record<string, typeof Inbox> = { INBOX: Inbox, Sent: SendIcon, Trash: Trash2, Drafts: FileText };
const folderLabels: Record<string, string> = { INBOX: 'Inbox', Sent: 'Trimise', Trash: 'Cos de gunoi', Drafts: 'Ciorne' };

function timeDisplay(dt: string) {
  const d = new Date(dt);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString('ro-RO', { weekday: 'short' });
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
}

export default function EmailPage({ user: _user }: { user: User | null }) {
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState('INBOX');
  const [messages, setMessages] = useState<EmailMsg[]>([]);
  const [selected, setSelected] = useState<EmailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<EmailFull | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  
  
  
  
  const [showTools, setShowTools] = useState(false);

  const loadAccount = useCallback(() => {
    apiCommand<EmailAccount | null>('email_get_account').then(acc => {
      if (acc) { setAccount(acc); setNoAccount(false); }
      else { setNoAccount(true); }
    }).catch(() => setNoAccount(true));
  }, []);

  const loadFolders = useCallback(() => {
    apiCommand<Folder[]>('email_list_folders').then(f => {
      if (f.length === 0) setFolders([{ name: 'INBOX', message_count: 0, unread_count: 0 }]);
      else setFolders(f);
    }).catch(() => {});
  }, []);

  const loadMessages = useCallback((folder: string, p: number) => {
    setLoading(true);
    apiCommand<{ messages: EmailMsg[]; total: number }>('email_list_messages', { folder, page: p, page_size: 50 })
      .then(r => { setMessages(r.messages || []); setTotal(r.total || 0); })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAccount(); }, [loadAccount]);
  useEffect(() => { if (account) { loadFolders(); loadMessages(currentFolder, 1); } }, [account, currentFolder, loadFolders, loadMessages]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await apiCommand<{ new_messages: number }>('email_sync_inbox');
      if (r.new_messages > 0) loadMessages(currentFolder, page);
      loadFolders();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare sync'); }
    finally { setSyncing(false); }
  };

  const handleSelectMsg = async (msgId: number) => {
    try {
      const full = await apiCommand<EmailFull>('email_get_message', { message_id: msgId });
      setSelected(full);
      setShowTools(false);
      
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m));
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const handleStar = async (msgId: number) => {
    await apiCommand('email_toggle_star', { message_id: msgId });
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_starred: !m.is_starred } : m));
  };

  const handleTrash = async (msgId: number) => {
    await apiCommand('email_trash', { message_id: msgId });
    setSelected(null);
    loadMessages(currentFolder, page);
  };

  const handleSendComplete = () => {
    setComposing(false);
    setReplyTo(null);
    setCurrentFolder('Sent');
    setPage(1);
    setSelected(null);
    loadFolders();
  };

  
  if (noAccount) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page">
        <div className="text-center max-w-md">
          <Mail className="h-12 w-12 mx-auto mb-3 text-content-muted opacity-30" />
          <h2 className="text-lg font-semibold text-content-primary mb-2">Email neconfigurat</h2>
          <p className="text-sm text-content-muted mb-4">
            Adaugă datele contului tau IMAP/SMTP pentru a putea trimite si primi emailuri.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 h-9 bg-accent px-4 text-xs font-semibold text-surface-primary hover:opacity-90 transition-opacity"
          >
            <SettingsIcon className="h-3.5 w-3.5" /> Mergi la Setari
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Page>
      <Page.Body maxWidth="full" padding="comfortable" className="flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden bg-surface-page">
          {}
      <div className="w-52 bg-surface-primary border-r border-line flex flex-col shrink-0 overflow-hidden">
        <div className="p-3 border-b border-line">
          <Button size="sm" block onClick={() => { setComposing(true); setReplyTo(null); setShowTools(false); }}>
            <PenSquare className="h-4 w-4" /> Compune
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {folders.map(f => {
            const Icon = folderIcons[f.name] || FileText;
            const label = folderLabels[f.name] || f.name;
            const active = currentFolder === f.name;
            return (
              <button key={f.name} onClick={() => { setCurrentFolder(f.name); setPage(1); setSelected(null); setShowTools(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors border-b border-line/30 ${active ? 'bg-accent/5 border-l-2 border-l-accent text-accent font-semibold' : 'text-content-primary hover:bg-surface-tertiary'}`}>
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {f.unread_count > 0 && <span className="text-pm-2xs px-1.5 py-0.5 rounded-full bg-accent text-surface-primary font-bold tabular-nums">{f.unread_count}</span>}
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-line space-y-1">
          <button
            onClick={() => { setShowTools(v => !v); setSelected(null); setComposing(false); }}
            className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs transition-colors ${
              showTools
                ? 'bg-accent/10 text-accent font-semibold'
                : 'text-content-muted hover:bg-surface-tertiary'
            }`}
            title="Template-uri, programare, mail merge, reguli, semnături"
          >
            <Wrench className="h-3 w-3" />
            Email tools
          </button>
          <button onClick={handleSync} disabled={syncing}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-content-muted hover:bg-surface-tertiary disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Se sincronizeaza...' : 'Sync'}
          </button>
          {account?.last_sync_at && (() => {
            const t = new Date(account.last_sync_at);
            const label = isNaN(t.getTime())
              ? account.last_sync_at
              : t.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
            return <p className="text-pm-2xs text-content-muted text-center tabular-nums">Ultima: {label}</p>;
          })()}
        </div>
      </div>

      {}
      <div className="w-96 border-r border-line flex flex-col shrink-0 overflow-hidden">
        <div className="px-3 py-2 border-b border-line flex items-center justify-between bg-surface-secondary">
          <span className="text-xs font-semibold uppercase tracking-wide text-content-muted">{folderLabels[currentFolder] || currentFolder} ({total})</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8 text-content-muted" /> :
            messages.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={currentFolder === 'INBOX' ? 'Inbox-ul este gol' : 'Nu exista mesaje aici'}
                body={currentFolder === 'INBOX'
                  ? 'Nicio discutie noua. Apasa "Sincronizare" pentru a verifică serverul IMAP.'
                  : `Nicio discutie in ${folderLabels[currentFolder] || currentFolder.toLowerCase()}.`}
                size="sm"
              />
            ) :
            messages.map(m => (
              <div key={m.id} onClick={() => handleSelectMsg(m.id)} role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleSelectMsg(m.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-line/40 hover:bg-surface-tertiary transition-colors cursor-pointer ${selected?.id === m.id ? 'bg-accent/5 border-l-2 border-l-accent' : ''} ${!m.is_read ? 'bg-surface-secondary' : ''}`}>
                <div className="flex items-start gap-2">
                  <button onClick={e => { e.stopPropagation(); handleStar(m.id); }} className="mt-0.5 shrink-0">
                    <Star className={`h-3.5 w-3.5 ${m.is_starred ? 'fill-status-amber text-status-amber' : 'text-content-muted'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate ${!m.is_read ? 'font-bold text-content-primary' : 'text-content-primary'}`}>{m.from_name || m.from_address}</p>
                      <span className="text-pm-2xs text-content-muted tabular-nums shrink-0 ml-2">{timeDisplay(m.date)}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${!m.is_read ? 'font-semibold text-content-primary' : 'text-content-muted'}`}>{m.subject || '(fără subiect)'}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-pm-2xs text-content-muted truncate flex-1">{m.snippet}</p>
                      {m.has_attachments && <Paperclip className="h-3 w-3 text-content-muted shrink-0" />}
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
        {total > 50 && (
          <div className="p-2 border-t border-line flex items-center justify-center gap-2">
            <button onClick={() => { setPage(p => Math.max(1, p - 1)); loadMessages(currentFolder, Math.max(1, page - 1)); }} disabled={page <= 1}
              className="text-xs text-content-muted hover:text-content-primary disabled:opacity-30">Înapoi</button>
            <span className="text-pm-2xs text-content-muted tabular-nums">Pag {page}</span>
            <button onClick={() => { setPage(p => p + 1); loadMessages(currentFolder, page + 1); }} disabled={page * 50 >= total}
              className="text-xs text-content-muted hover:text-content-primary disabled:opacity-30">Înainte</button>
          </div>
        )}
      </div>

      {}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 bg-surface-primary">
        {composing ? (
          <ComposeView onClose={() => { setComposing(false); setReplyTo(null); }} onSent={handleSendComplete} replyTo={replyTo} />
        ) : showTools ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="shrink-0 px-4 py-3 border-b border-line bg-surface-secondary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-content-primary">Email tools</h2>
                <span className="text-pm-2xs text-content-muted">— template-uri, programare, mail merge</span>
              </div>
              <button
                onClick={() => setShowTools(false)}
                className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors"
                aria-label="Închide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <EmailEnhancements />
            </div>
          </div>
        ) : selected ? (
          <EmailView email={selected} onTrash={() => handleTrash(selected.id)}
            onReply={() => { setReplyTo(selected); setComposing(true); }}
            onBack={() => setSelected(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-content-muted px-6">
            <Mail className="h-12 w-12 mb-3 opacity-25" />
            <p className="text-sm text-content-secondary">Selectează un email</p>
            <p className="text-pm-xs mt-1 text-content-muted text-center max-w-xs">
              Apasă <span className="font-semibold text-content-secondary">Compune</span> pentru un mesaj nou
              sau <span className="font-semibold text-content-secondary">Email tools</span> pentru template-uri și mail merge.
            </p>
          </div>
        )}
      </div>
        </div>
      </Page.Body>
    </Page>
  );
}




function EmailView({ email, onTrash, onReply, onBack }: { email: EmailFull; onTrash: () => void; onReply: () => void; onBack: () => void; }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && email.body_html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`<html><head><style>body{font-family:Inter,sans-serif;font-size:14px;color:#1f2937;margin:12px;line-height:1.5;}</style></head><body>${email.body_html}</body></html>`);
        doc.close();
      }
    }
  }, [email.body_html]);

  const handleDownloadAtt = async (attId: number, filename: string) => {
    try {
      const data = await apiCommand<{ data: string; content_type: string }>('email_download_attachment', { attachment_id: attId });
      const bytes = atob(data.data);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: data.content_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Eroare download atasament'); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {}
      <div className="p-4 border-b border-line shrink-0 bg-surface-secondary">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={onBack} className="lg:hidden p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent"><ChevronLeft className="h-4 w-4" /></button>
          <h2 className="text-base font-semibold text-content-primary flex-1">{email.subject || '(fără subiect)'}</h2>
          <Button size="sm" onClick={onReply}>Raspunde</Button>
          <button onClick={onTrash} className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-status-red"><Trash2 className="h-4 w-4" /></button>
        </div>
        <div className="text-xs text-content-muted">
          <span className="font-medium text-content-primary">{email.from_name || email.from_address}</span>
          <span className="mx-1">{'→'}</span>
          <span>{email.to_addresses}</span>
          <span className="ml-2 tabular-nums">{email.date?.slice(0, 16)}</span>
        </div>
      </div>

      {}
      <div className="flex-1 overflow-hidden min-h-0 bg-surface-primary">
        {email.body_html ? (
          <iframe ref={iframeRef} className="w-full h-full border-0" sandbox="allow-same-origin" title="Email body" />
        ) : (
          <div className="p-4 overflow-y-auto h-full"><pre className="text-sm text-content-primary whitespace-pre-wrap font-sans">{email.body_text || '(continut gol)'}</pre></div>
        )}
      </div>

      {}
      {email.attachments.length > 0 && (
        <div className="p-3 border-t border-line shrink-0 bg-surface-secondary">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted mb-2">Atasamente ({email.attachments.length})</p>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map(att => (
              <button key={att.id} onClick={() => handleDownloadAtt(att.id, att.filename)}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-primary border border-line text-xs text-content-primary hover:bg-surface-tertiary transition-colors">
                <Paperclip className="h-3 w-3 text-content-muted" />
                <span className="truncate max-w-[150px]">{att.filename}</span>
                <span className="text-pm-2xs text-content-muted tabular-nums">({Math.round(att.size_bytes / 1024)}KB)</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}




function ComposeView({ onClose, onSent, replyTo }: { onClose: () => void; onSent: () => void; replyTo: EmailFull | null; }) {
  const [to, setTo] = useState(replyTo ? replyTo.from_address : '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState(replyTo ? `<br/><br/>--- Mesaj original ---<br/>${replyTo.body_html || replyTo.body_text || ''}` : '');
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<{ filename: string; content_type: string; data: string }[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!to.trim()) { toast.error('Introdu adresa destinatar'); return; }
    setSending(true);
    try {
      const toList = to.split(',').map(e => ({ email: e.trim(), name: null }));
      const ccList = cc ? cc.split(',').map(e => ({ email: e.trim(), name: null })) : undefined;
      await apiCommand('email_send', {
        request: {
          to: toList, cc: ccList, subject, body_html: body,
          attachments: files.length > 0 ? files : undefined,
          reply_to_message_id: replyTo?.id,
        },
      });
      onSent();
    } catch (err: any) {
      const msg = err?.message || err?.toString?.() || JSON.stringify(err);
      console.error('[Email] Send failed:', err);
      toast.error('Eroare trimitere email:\n' + msg);
    }
    finally { setSending(false); }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1] || '';
      setFiles(prev => [...prev, { filename: file.name, content_type: file.type || 'application/octet-stream', data: b64 }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const inputClass = 'w-full h-9 border border-line bg-surface-primary px-3 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors';
  const labelClass = 'block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {}
      <div className="shrink-0 px-4 py-3 border-b border-line flex items-center justify-between bg-surface-secondary">
        <div className="flex items-center gap-2">
          <PenSquare className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-content-primary">{replyTo ? 'Răspunde' : 'Email nou'}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors" aria-label="Închide"><X className="h-4 w-4" /></button>
      </div>

      {
}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Către *</label>
              <input value={to} onChange={e => setTo(e.target.value)} placeholder="email@exemplu.ro" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>CC</label>
              <input value={cc} onChange={e => setCc(e.target.value)} placeholder="(opțional)" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Subiect</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subiect email" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Mesaj</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Scrie mesajul..."
              rows={12}
              className="w-full bg-surface-primary border border-line text-sm text-content-primary placeholder:text-content-muted resize-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>

          {files.length > 0 && (
            <div>
              <label className={labelClass}>Atașamente ({files.length})</label>
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-secondary border border-line text-xs text-content-primary">
                    <Paperclip className="h-3 w-3 text-content-muted" />
                    <span className="truncate max-w-[160px]">{f.filename}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-content-muted hover:text-status-red" aria-label="Elimină atașament"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {}
      <div className="shrink-0 px-5 py-3 border-t border-line bg-surface-secondary flex items-center gap-2">
        <Button size="sm" onClick={handleSend} disabled={sending}>
          <SendIcon className="h-4 w-4" /> {sending ? 'Se trimite...' : 'Trimite'}
        </Button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-label="Adaugă atașament"
          className="p-2 text-content-muted hover:bg-surface-tertiary hover:text-accent transition-colors flex items-center gap-1"
          title="Adaugă atașament"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input ref={fileInput} type="file" className="hidden" onChange={handleFileAdd} />
        <button
          type="button"
          onClick={onClose}
          className="ml-auto px-3 py-1.5 text-xs text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-colors"
        >
          Anulează
        </button>
      </div>
    </div>
  );
}
