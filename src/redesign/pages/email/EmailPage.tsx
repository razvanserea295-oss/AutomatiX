











































import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Mail, Inbox, Send as SendIcon, FileText, Trash2, RefreshCw, Star, Paperclip, ChevronLeft, Loader2, PenSquare, X, Settings as SettingsIcon, Wrench, Search } from 'lucide-react';
import { Link } from 'wouter';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import type { User } from '@/core/types';
import EmptyState from '@/redesign/ui/EmptyState';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';
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
  
  
  const [search, setSearch] = useState('');
  
  
  const [composeSeed, setComposeSeed] = useState<{ subject?: string; body?: string } | null>(null);

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
      
      startMorphTransition(() => flushSync(() => {
        setSelected(full);
        setShowTools(false);
      }), { dir: 'forward' });
      
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
    setComposeSeed(null);
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
          <h2 className="text-pm-lg font-semibold text-content-primary mb-2">Email neconfigurat</h2>
          <p className="text-pm-sm text-content-muted mb-4">
            Adaugă datele contului tau IMAP/SMTP pentru a putea trimite si primi emailuri.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-accent px-4 text-pm-sm font-semibold text-[var(--color-on-accent)] hover:opacity-90 transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <SettingsIcon className="h-3.5 w-3.5" /> Mergi la Setări
          </Link>
        </div>
      </div>
    );
  }

  
  const activeLabel = folderLabels[currentFolder] || currentFolder;

  
  const lastSyncLabel = (() => {
    if (!account?.last_sync_at) return null;
    const t = new Date(account.last_sync_at);
    return isNaN(t.getTime())
      ? account.last_sync_at
      : t.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  })();

  
  const q = search.trim().toLowerCase();
  const visibleMessages = q
    ? messages.filter(m =>
        (m.from_name || m.from_address || '').toLowerCase().includes(q) ||
        (m.subject || '').toLowerCase().includes(q) ||
        (m.snippet || '').toLowerCase().includes(q))
    : messages;

  return (
    <Page fit>
      <Page.Body fit maxWidth="full" padding="comfortable">

        {


}
        <div className="enter-up shrink-0 pb-4 border-b border-line/60">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
                <h1 className="text-pm-2xl font-semibold text-content-primary leading-tight truncate">
                  {account?.email_address || 'Email'}
                </h1>
              </div>
            </div>

            <div className="relative flex-1 min-w-0 lg:max-w-md lg:mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Caută în mesaje (expeditor, subiect, conținut)…"
                className="w-full h-9 border border-line bg-surface-primary rounded-xl pl-9 pr-3 text-pm-sm text-content-primary placeholder:text-content-muted focus:outline-none focus-visible:outline-none focus:border-accent focus:shadow-[var(--ring-soft)] transition-smooth duration-150"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {lastSyncLabel && (
                <span className="hidden xl:inline text-pm-2xs text-content-muted tabular-nums whitespace-nowrap">
                  Ultima: {lastSyncLabel}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                title="Sincronizează IMAP"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Se sincronizeaza...' : 'Sync'}
              </Button>
              <Button
                variant={showTools ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => { setShowTools(v => !v); setSelected(null); setComposing(false); }}
                title="Template-uri, programare, mail merge, reguli, semnături"
              >
                <Wrench className="h-4 w-4" /> Email tools
              </Button>
              <Button size="sm" onClick={() => { setComposing(true); setReplyTo(null); setShowTools(false); }}>
                <PenSquare className="h-4 w-4" /> Compune
              </Button>
            </div>
          </div>
        </div>

        {


}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 enter-up flex-1 min-h-0" style={{ animationDelay: '70ms' }}>

          {}
          <aside className="xl:col-span-2 min-h-0 xl:h-full">
            <Card padding="none" className="overflow-hidden flex flex-col xl:h-full min-h-0">
              <div className="shrink-0 px-4 py-3 border-b border-line/70">
                <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Foldere</p>
              </div>
              <nav className="py-1.5 flex-1 min-h-0 overflow-y-auto">
                {folders.map(f => {
                  const Icon = folderIcons[f.name] || FileText;
                  const label = folderLabels[f.name] || f.name;
                  const active = currentFolder === f.name;
                  return (
                    <button key={f.name} onClick={() => { setCurrentFolder(f.name); setPage(1); setSelected(null); setShowTools(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-pm-sm transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${active ? 'bg-accent/5 border-l-2 border-l-accent text-accent font-semibold' : 'border-l-2 border-l-transparent text-content-primary hover:bg-surface-tertiary'}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{label}</span>
                      {f.unread_count > 0 && <span className="anim-pop text-pm-2xs px-1.5 py-0.5 rounded-full bg-accent text-[var(--color-on-accent)] font-bold tabular-nums shrink-0">{f.unread_count}</span>}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </aside>

          {}
          <section className="xl:col-span-4 min-w-0 min-h-0 xl:h-full">
            <Card padding="none" className="overflow-hidden flex flex-col xl:h-full min-h-0">
              <div className="shrink-0 px-4 py-3 border-b border-line/70 flex items-center justify-between gap-2">
                <span className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted truncate">
                  {activeLabel}
                </span>
                <span className="text-pm-2xs text-content-muted tabular-nums shrink-0">
                  {q ? `${visibleMessages.length} / ${total}` : total}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8 text-content-muted" /> :
                  visibleMessages.length === 0 ? (
                    <EmptyState
                      icon={Inbox}
                      title={q ? 'Niciun rezultat' : (currentFolder === 'INBOX' ? 'Inbox-ul este gol' : 'Nu exista mesaje aici')}
                      description={q
                        ? `Niciun mesaj pentru „${search}".`
                        : currentFolder === 'INBOX'
                          ? 'Nicio discutie noua. Apasa "Sync" pentru a verifică serverul IMAP.'
                          : `Nicio discutie in ${folderLabels[currentFolder] || currentFolder.toLowerCase()}.`}
                    />
                  ) : (
                  <div key={`${currentFolder}|${q}`} className="stagger-in">
                  {visibleMessages.map(m => (
                    <div key={m.id} onClick={() => handleSelectMsg(m.id)} role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleSelectMsg(m.id)}
                      style={{ viewTransitionName: selected?.id === m.id ? vtName('email', m.id) : undefined }}
                      className={`w-full text-left px-3 py-2.5 border-b border-line/40 hover:bg-surface-tertiary transition-smooth duration-150 cursor-pointer focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${selected?.id === m.id ? 'bg-accent/5 border-l-2 border-l-accent vt-morph' : ''} ${!m.is_read ? 'bg-surface-secondary' : ''}`}>
                      <div className="flex items-start gap-2">
                        <button onClick={e => { e.stopPropagation(); handleStar(m.id); }} className="mt-0.5 shrink-0 rounded-full inline-flex items-center justify-center transition-smooth duration-150 hover:text-status-amber active:scale-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
                          <Star className={`h-3.5 w-3.5 ${m.is_starred ? 'fill-status-amber text-status-amber' : 'text-content-muted'}`} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-pm-xs truncate ${!m.is_read ? 'font-bold text-content-primary' : 'text-content-primary'}`} title={m.from_name || m.from_address}>{m.from_name || m.from_address}</p>
                            <span className="text-pm-2xs text-content-muted tabular-nums shrink-0 ml-2">{timeDisplay(m.date)}</span>
                          </div>
                          <p className={`text-pm-xs truncate mt-0.5 ${!m.is_read ? 'font-semibold text-content-primary' : 'text-content-muted'}`} title={m.subject || '(fără subiect)'}>{m.subject || '(fără subiect)'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-pm-2xs text-content-muted truncate flex-1">{m.snippet}</p>
                            {m.has_attachments && <Paperclip className="h-3 w-3 text-content-muted shrink-0" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                  )
                }
              </div>
              {total > 50 && (
                <div className="shrink-0 p-2 border-t border-line flex items-center justify-center gap-2">
                  <button onClick={() => { setPage(p => Math.max(1, p - 1)); loadMessages(currentFolder, Math.max(1, page - 1)); }} disabled={page <= 1}
                    className="rounded-lg px-2 py-1 text-pm-xs text-content-muted transition-smooth duration-150 hover:text-content-primary hover:bg-surface-tertiary active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-40">Înapoi</button>
                  <span className="text-pm-2xs text-content-muted tabular-nums">Pag {page}</span>
                  <button onClick={() => { setPage(p => p + 1); loadMessages(currentFolder, page + 1); }} disabled={page * 50 >= total}
                    className="rounded-lg px-2 py-1 text-pm-xs text-content-muted transition-smooth duration-150 hover:text-content-primary hover:bg-surface-tertiary active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-40">Înainte</button>
                </div>
              )}
            </Card>
          </section>

          {}
          <section className="xl:col-span-6 min-w-0 min-h-0 xl:h-full">
            <Card padding="none" className="overflow-hidden min-h-[56vh] xl:min-h-0 xl:h-full flex flex-col">
              {composing ? (
                <div key="compose" className="enter-fade flex flex-col h-full min-h-0">
                <ComposeView onClose={() => { setComposing(false); setReplyTo(null); setComposeSeed(null); }} onSent={handleSendComplete} replyTo={replyTo} seed={composeSeed} />
                </div>
              ) : showTools ? (
                <div key="tools" className="enter-fade flex flex-col h-full overflow-hidden">
                  <div className="shrink-0 px-4 py-3 border-b border-line bg-surface-secondary flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-accent" />
                      <h2 className="text-pm-md font-semibold text-content-primary">Email tools</h2>
                      <span className="text-pm-2xs text-content-muted">— template-uri, programare, mail merge</span>
                    </div>
                    <IconButton
                      intent="primary"
                      size="sm"
                      onClick={() => setShowTools(false)}
                      aria-label="Închide"
                      title="Închide"
                    >
                      <X />
                    </IconButton>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <EmailEnhancements
                      onInsertSubject={(s) => { setComposeSeed(prev => ({ ...prev, subject: s })); setShowTools(false); setReplyTo(null); setComposing(true); }}
                      onInsertBody={(b) => { setComposeSeed(prev => ({ ...prev, body: b })); setShowTools(false); setReplyTo(null); setComposing(true); }}
                    />
                  </div>
                </div>
              ) : selected ? (
                <div key={`mail-${selected.id}`} className="enter-up flex-1 min-h-0 flex flex-col motion-reduce:animate-none">
                <EmailView email={selected} onTrash={() => handleTrash(selected.id)}
                  onReply={() => { setReplyTo(selected); setComposing(true); }}
                  onBack={() => setSelected(null)} />
                </div>
              ) : (
                <div key="empty" className="enter-fade flex-1 flex flex-col items-center justify-center text-content-muted px-6 py-16">
                  <Mail className="h-12 w-12 mb-3 opacity-25" />
                  <p className="text-pm-md text-content-secondary">Selectează un email</p>
                  <p className="text-pm-xs mt-1 text-content-muted text-center max-w-xs">
                    Apasă <span className="font-semibold text-content-secondary">Compune</span> pentru un mesaj nou
                    sau <span className="font-semibold text-content-secondary">Email tools</span> pentru template-uri și mail merge.
                  </p>
                </div>
              )}
            </Card>
          </section>
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
    <div className="flex flex-col h-full overflow-hidden vt-morph" style={{ viewTransitionName: vtName('email', email.id) }}>
      {}
      <div className="p-4 border-b border-line shrink-0 bg-surface-secondary">
        <div className="flex items-center gap-2 mb-2">
          <IconButton size="sm" intent="primary" onClick={onBack} className="lg:hidden" aria-label="Înapoi la listă" title="Înapoi la listă"><ChevronLeft /></IconButton>
          <h2 className="text-pm-lg font-semibold text-content-primary flex-1 min-w-0 truncate" title={email.subject || '(fără subiect)'}>{email.subject || '(fără subiect)'}</h2>
          <Button size="sm" onClick={onReply}>Raspunde</Button>
          <IconButton size="sm" intent="danger" onClick={onTrash} aria-label="Mută la coș" title="Mută la coș"><Trash2 /></IconButton>
        </div>
        <div className="flex items-center gap-1 text-pm-xs text-content-muted min-w-0">
          <span className="font-medium text-content-primary shrink-0 max-w-[40%] truncate">{email.from_name || email.from_address}</span>
          <span className="shrink-0">{'→'}</span>
          <span className="min-w-0 truncate">{email.to_addresses}</span>
          <span className="ml-2 tabular-nums shrink-0">{email.date?.slice(0, 16)}</span>
        </div>
      </div>

      {}
      <div className="flex-1 overflow-hidden min-h-0 bg-surface-primary">
        {email.body_html ? (
          <iframe ref={iframeRef} className="w-full h-full border-0" sandbox="allow-same-origin" title="Email body" />
        ) : (
          <div className="p-4 overflow-y-auto h-full"><pre className="text-pm-md text-content-primary whitespace-pre-wrap font-sans">{email.body_text || '(continut gol)'}</pre></div>
        )}
      </div>

      {}
      {email.attachments.length > 0 && (
        <div className="p-3 border-t border-line shrink-0 bg-surface-secondary">
          <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-2">Atasamente ({email.attachments.length})</p>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map(att => (
              <button key={att.id} onClick={() => handleDownloadAtt(att.id, att.filename)}
                title={`Descarcă ${att.filename}`}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-primary border border-line/70 text-pm-xs text-content-primary hover:bg-surface-tertiary transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
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




function ComposeView({ onClose, onSent, replyTo, seed }: { onClose: () => void; onSent: () => void; replyTo: EmailFull | null; seed?: { subject?: string; body?: string } | null; }) {
  const [to, setTo] = useState(replyTo ? replyTo.from_address : '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : (seed?.subject ?? ''));
  const [body, setBody] = useState(replyTo ? `<br/><br/>--- Mesaj original ---<br/>${replyTo.body_html || replyTo.body_text || ''}` : (seed?.body ?? ''));
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

  const inputClass = 'w-full h-9 rounded-xl border border-line/70 bg-surface-secondary/40 px-3 text-pm-sm text-content-primary placeholder:text-content-muted focus:outline-none focus-visible:outline-none focus:border-accent focus:shadow-[var(--ring-soft)] transition-smooth duration-150';
  const labelClass = 'block text-pm-2xs font-bold uppercase tracking-wide text-content-muted mb-1';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {}
      <div className="shrink-0 px-4 py-3 border-b border-line flex items-center justify-between bg-surface-secondary">
        <div className="flex items-center gap-2">
          <PenSquare className="h-4 w-4 text-accent" />
          <h3 className="text-pm-md font-semibold text-content-primary">{replyTo ? 'Răspunde' : 'Email nou'}</h3>
        </div>
        <IconButton intent="primary" size="sm" onClick={onClose} aria-label="Închide" title="Închide"><X /></IconButton>
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
              className="w-full rounded-xl bg-surface-secondary/40 border border-line/70 text-pm-sm text-content-primary placeholder:text-content-muted resize-none px-3 py-2 focus:outline-none focus-visible:outline-none focus:border-accent focus:shadow-[var(--ring-soft)] transition-smooth duration-150"
            />
          </div>

          {files.length > 0 && (
            <div>
              <label className={labelClass}>Atașamente ({files.length})</label>
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-secondary border border-line/70 text-pm-xs text-content-primary">
                    <Paperclip className="h-3 w-3 text-content-muted" />
                    <span className="truncate max-w-[160px]" title={f.filename}>{f.filename}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="rounded-full inline-flex items-center justify-center text-content-muted transition-smooth duration-150 hover:text-status-red active:scale-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]" aria-label="Elimină atașament"><X className="h-3 w-3" /></button>
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
          className="p-2 rounded-xl text-content-muted hover:bg-surface-tertiary hover:text-accent transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] inline-flex items-center justify-center gap-1"
          title="Adaugă atașament"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input ref={fileInput} type="file" className="hidden" onChange={handleFileAdd} />
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-xl px-3 py-1.5 text-pm-xs text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
        >
          Anulează
        </button>
      </div>
    </div>
  );
}
