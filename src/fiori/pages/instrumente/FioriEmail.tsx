import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Button, BusyIndicator,
  List, ListItemStandard, Panel, Label, Text, ObjectStatus,
  FlexBox,
} from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// Field shapes mirrored 1:1 from the SaaS page src/redesign/pages/email/EmailPage.tsx.
interface EmailMsg {
  id: number;
  from_address: string;
  from_name: string | null;
  subject: string;
  snippet: string;
  date: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  folder: string;
}

interface Att { id: number; filename: string; content_type: string; size_bytes: number; }

interface EmailFull {
  id: number;
  from_address: string;
  from_name: string | null;
  to_addresses: string;
  cc_addresses: string | null;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  date: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  attachments: Att[];
  folder: string;
}

interface EmailAccount {
  id: number;
  email_address: string;
  display_name: string;
  enabled: boolean;
}

function formatDate(dt: string | null | undefined): string {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString('ro-RO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Strips HTML to plain text for a read-only body preview.
function htmlToText(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent || el.innerText || '';
}

export default function FioriEmail(_props: { user: User }) {
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [messages, setMessages] = useState<EmailMsg[]>([]);
  const [selected, setSelected] = useState<EmailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadMessages = useCallback(() => {
    setLoading(true);
    apiCommand<{ messages: EmailMsg[]; total: number }>('email_list_messages', {
      folder: 'INBOX', page: 1, page_size: 50,
    })
      .then(r => setMessages(r.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiCommand<EmailAccount | null>('email_get_account')
      .then(acc => {
        if (acc) { setAccount(acc); setNoAccount(false); loadMessages(); }
        else { setNoAccount(true); setLoading(false); }
      })
      .catch(() => { setNoAccount(true); setLoading(false); });
  }, [loadMessages]);

  const handleSelect = useCallback(async (id: number) => {
    try {
      const full = await apiCommand<EmailFull>('email_get_message', { message_id: id });
      setSelected(full);
      setMessages(prev => prev.map(m => (m.id === id ? { ...m, is_read: true } : m)));
    } catch {
      setSelected(null);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await apiCommand<{ new_messages: number }>('email_sync_inbox');
      loadMessages();
    } catch {
      // ignore — list rămâne neschimbată
    } finally {
      setSyncing(false);
    }
  }, [loadMessages]);

  const onItemClick: NonNullable<ComponentProps<typeof List>['onItemClick']> = (e) => {
    const idAttr = e.detail.item.getAttribute('data-msg-id');
    if (idAttr) void handleSelect(Number(idAttr));
  };

  const heading = account?.email_address
    ? `Email — ${account.email_address}`
    : 'Email';

  // Read-only body text for the detail panel.
  const bodyText = selected
    ? (selected.body_text && selected.body_text.trim().length > 0
        ? selected.body_text
        : selected.body_html
          ? htmlToText(selected.body_html)
          : '(conținut gol)')
    : '';

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={
        <DynamicPageTitle
          actionsBar={
            <div slot="actionsBar" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Button design="Emphasized" disabled={syncing || noAccount} onClick={() => void handleSync()}>
                {syncing ? 'Se sincronizează…' : 'Sincronizează'}
              </Button>
              <Button design="Transparent" disabled={noAccount} onClick={() => loadMessages()}>
                Reîmprospătează
              </Button>
            </div>
          }
        >
          <Title slot="heading" level="H3">{heading}</Title>
        </DynamicPageTitle>
      }
    >
      <div style={{ padding: '1rem', height: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
            <BusyIndicator active size="L" />
          </div>
        ) : noAccount ? (
          <Panel headerText="Email neconfigurat" collapsed={false}>
            <Text>
              Niciun cont IMAP/SMTP configurat. Adaugă datele contului din Setări pentru a vedea mesajele.
            </Text>
          </Panel>
        ) : (
          <FlexBox style={{ gap: '1rem', height: '100%', alignItems: 'stretch' }}>
            {/* Lista de mesaje (expeditor, subiect, dată) */}
            <div style={{ flex: '0 0 40%', minWidth: '20rem', overflowY: 'auto' }}>
              <List
                headerText={`Mesaje (${messages.length})`}
                noDataText="Fără mesaje"
                selectionMode="Single"
                onItemClick={onItemClick}
              >
                {messages.map(m => (
                  <ListItemStandard
                    key={m.id}
                    data-msg-id={m.id}
                    icon="email"
                    text={m.from_name || m.from_address}
                    description={m.subject || '(fără subiect)'}
                    additionalText={formatDate(m.date)}
                    additionalTextState={m.is_read ? 'None' : 'Information'}
                    selected={selected?.id === m.id}
                  />
                ))}
              </List>
            </div>

            {/* Panoul cu corpul mesajului selectat */}
            <div style={{ flex: '1 1 auto', minWidth: 0, overflowY: 'auto' }}>
              {selected ? (
                <Panel
                  headerText={selected.subject || '(fără subiect)'}
                  collapsed={false}
                  fixed
                >
                  <FlexBox direction="Column" style={{ gap: '0.75rem' }}>
                    <FlexBox style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Label>Expeditor:</Label>
                      <Text>{selected.from_name || selected.from_address}</Text>
                      <ObjectStatus state={statusState(selected.is_read ? 'citit' : 'nou')}>
                        {selected.is_read ? 'Citit' : 'Nou'}
                      </ObjectStatus>
                    </FlexBox>
                    <FlexBox style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Label>Destinatar:</Label>
                      <Text>{selected.to_addresses || '—'}</Text>
                    </FlexBox>
                    <FlexBox style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Label>Dată:</Label>
                      <Text>{formatDate(selected.date)}</Text>
                    </FlexBox>
                    {selected.has_attachments && selected.attachments.length > 0 && (
                      <FlexBox style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Label>Atașamente:</Label>
                        <Text>
                          {selected.attachments.map(a => a.filename).join(', ')}
                        </Text>
                      </FlexBox>
                    )}
                    <div
                      style={{
                        marginTop: '0.5rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--sapList_BorderColor, #e5e5e5)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      <Text>{bodyText}</Text>
                    </div>
                  </FlexBox>
                </Panel>
              ) : (
                <Panel headerText="Mesaj" collapsed={false} fixed>
                  <Text>Selectează un mesaj din listă pentru a-i vedea conținutul.</Text>
                </Panel>
              )}
            </div>
          </FlexBox>
        )}
      </div>
    </DynamicPage>
  );
}
