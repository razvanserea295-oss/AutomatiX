import { useCallback, useEffect, useState } from 'react';
import { Download, Mail, PenSquare, RefreshCw, Reply, Send } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { formatDateTimeRo } from '@/lib/format';
import { Page, PageHeader, PageBody, PageToolbar, PageSplit, PagePanel } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card } from '@/v2/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { Textarea } from '@/v2/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/v2/components/ui/tabs';

interface EmailMsg {
  id: number;
  from_address: string;
  from_name: string | null;
  subject: string;
  snippet: string;
  date: string;
  is_read: boolean;
  has_attachments: boolean;
}

interface EmailFull {
  id: number;
  from_address: string;
  from_name: string | null;
  to_addresses: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  date: string;
  is_read: boolean;
  has_attachments: boolean;
  attachments?: { id: number; filename: string; size_bytes: number }[];
}

interface EmailAccount {
  email_address: string;
  display_name: string;
}

export default function EmailPage() {
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [folder, setFolder] = useState('INBOX');
  const [messages, setMessages] = useState<EmailMsg[]>([]);
  const [selected, setSelected] = useState<EmailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);

  const loadAccount = useCallback(() => {
    apiCommand<EmailAccount | null>('email_get_account')
      .then((acc) => {
        if (acc) {
          setAccount(acc);
          setNoAccount(false);
        } else {
          setNoAccount(true);
        }
      })
      .catch(() => setNoAccount(true));
  }, []);

  const loadMessages = useCallback((f: string) => {
    setLoading(true);
    apiCommand<{ messages: EmailMsg[]; total: number }>('email_list_messages', {
      folder: f,
      page: 1,
      page_size: 50,
    })
      .then((r) => setMessages(r.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  useEffect(() => {
    if (account) loadMessages(folder);
  }, [account, folder, loadMessages]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await apiCommand<{ new_messages: number }>('email_sync_inbox');
      if (r.new_messages > 0) loadMessages(folder);
      toast.success(r.new_messages > 0 ? `${r.new_messages} mesaje noi` : 'Inbox sincronizat');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare sync');
    } finally {
      setSyncing(false);
    }
  };

  const openMail = async (msg: EmailMsg) => {
    try {
      const full = await apiCommand<EmailFull>('email_get_message', { message_id: msg.id });
      setSelected(full);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const openReply = () => {
    if (!selected) return;
    setReplyBody(`\n\n--- Mesaj original ---\n${selected.body_text || ''}`);
    setReplyOpen(true);
  };

  const sendReply = async () => {
    if (!selected || !replyBody.trim()) return;
    setSending(true);
    try {
      await apiCommand('email_send', {
        request: {
          to: [{ email: selected.from_address, name: selected.from_name }],
          subject: selected.subject.startsWith('Re:') ? selected.subject : `Re: ${selected.subject}`,
          body_html: replyBody.replace(/\n/g, '<br/>'),
          reply_to_message_id: selected.id,
        },
      });
      toast.success('Email trimis');
      setReplyOpen(false);
      setReplyBody('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare trimitere');
    } finally {
      setSending(false);
    }
  };

  const sendCompose = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      toast.error('Destinatar și subiect sunt obligatorii');
      return;
    }
    setSending(true);
    try {
      await apiCommand('email_send', {
        request: {
          to: composeTo.split(',').map((e) => ({ email: e.trim(), name: null })),
          subject: composeSubject.trim(),
          body_html: composeBody.replace(/\n/g, '<br/>'),
        },
      });
      toast.success('Email trimis');
      setComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setFolder('Sent');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare trimitere');
    } finally {
      setSending(false);
    }
  };

  const downloadAttachment = async (attId: number, filename: string) => {
    try {
      const data = await apiCommand<{ data: string; content_type: string }>('email_download_attachment', {
        attachment_id: attId,
      });
      const link = document.createElement('a');
      link.href = `data:${data.content_type};base64,${data.data}`;
      link.download = filename;
      link.click();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare descărcare');
    }
  };

  if (noAccount) {
    return (
      <Page fill>
        <PageHeader title="Email" description="Mesaje IMAP" />
        <PageBody>
          <Card className="shadow-none">
            <div className="flex flex-col items-center gap-2 p-[var(--density-card-p)] text-center">
              <Mail className="h-8 w-8 text-muted-foreground" />
              <p className="density-meta text-muted-foreground">Niciun cont email configurat.</p>
              <Button variant="outline" onClick={() => { window.location.hash = '/v2/settings'; }}>
                Configurează în Setări
              </Button>
            </div>
          </Card>
        </PageBody>
      </Page>
    );
  }

  return (
    <Page fill>
      <PageHeader
        title="Email"
        description={account ? account.email_address : 'Mesaje IMAP'}
        actions={
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <PenSquare className="mr-1.5 h-3.5 w-3.5" />Compune
            </Button>
            <Button size="sm" variant="outline" disabled={syncing} onClick={() => void handleSync()}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
        }
      />

      <PageToolbar>
        <Tabs className="mb-0">
          <TabsList>
            <TabsTrigger active={folder === 'INBOX'} onClick={() => { setFolder('INBOX'); setSelected(null); }}>
              Inbox
            </TabsTrigger>
            <TabsTrigger active={folder === 'Sent'} onClick={() => { setFolder('Sent'); setSelected(null); }}>
              Trimise
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </PageToolbar>

      <PageBody>
        <PageSplit variant="wide">
          <PagePanel scroll bodyClassName="divide-y">
            <AsyncContent loading={loading} error={null} empty={messages.length === 0}>
              {messages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void openMail(m)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 ${selected?.id === m.id ? 'bg-muted' : ''}`}
                >
                  <p className={`truncate font-medium ${m.is_read ? '' : 'text-primary'}`}>{m.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.from_name || m.from_address} · {formatDateTimeRo(m.date)}
                  </p>
                </button>
              ))}
            </AsyncContent>
          </PagePanel>
          <PagePanel scroll>
            {selected ? (
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{selected.subject}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selected.from_name || selected.from_address} · {formatDateTimeRo(selected.date)}
                    </p>
                  </div>
                  {folder === 'INBOX' && (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={openReply}>
                      <Reply className="mr-1.5 h-3.5 w-3.5" />Răspunde
                    </Button>
                  )}
                </div>
                <pre className="mt-3 whitespace-pre-wrap break-words text-sm">
                  {selected.body_text || selected.body_html?.replace(/<[^>]+>/g, '') || '—'}
                </pre>
                {(selected.attachments?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.attachments!.map((a) => (
                      <Button
                        key={a.id}
                        size="sm"
                        variant="outline"
                        onClick={() => void downloadAttachment(a.id, a.filename)}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        {a.filename}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="p-3 text-sm text-muted-foreground">Selectează un email.</p>
            )}
          </PagePanel>
        </PageSplit>
      </PageBody>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Răspunde — {selected?.subject}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Către</Label>
            <Input value={selected?.from_address || ''} readOnly />
            <Label>Mesaj</Label>
            <Textarea rows={8} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>Anulează</Button>
            <Button disabled={sending} onClick={() => void sendReply()}>
              <Send className="mr-2 h-4 w-4" />{sending ? 'Se trimite…' : 'Trimite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Email nou</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            <Label>Către (virgulă pentru mai mulți)</Label>
            <Input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="client@firma.ro" />
            <Label>Subiect</Label>
            <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
            <Label>Mesaj</Label>
            <Textarea rows={8} value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Anulează</Button>
            <Button disabled={sending} onClick={() => void sendCompose()}>
              <Send className="mr-2 h-4 w-4" />{sending ? 'Se trimite…' : 'Trimite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
