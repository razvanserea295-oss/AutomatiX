import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Card, CardHeader,
  Button, AnalyticalTable, BusyIndicator, ObjectStatus,
  Timeline, TimelineItem, Input, MessageStrip,
} from '@ui5/webcomponents-react';
import type { AnalyticalTableColumnDefinition, AnalyticalTableCellInstance } from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import { statusState } from '@/fiori/lib/statusState';
import type { User } from '@/core/types';

// ─── Mirror SaaS data shapes (src/redesign/pages/chat/ChatPage.tsx) ───
interface Conversation {
  id: number; other_user_id: number; other_user_name: string; other_user_role: string;
  last_message: string | null; last_message_at: string | null; last_sender_id: number | null;
  unread_count: number; is_group: boolean; group_name: string | null; group_members: string | null;
  group_avatar: string | null;
}

interface Message {
  id: number; conversation_id: number; sender_id: number; sender_name: string;
  content: string; message_type: string;
  attachment_name: string | null; attachment_data: string | null;
  reference_type: string | null; reference_id: number | null; reference_label: string | null;
  delivered_at: string | null; read_at: string | null; created_at: string;
  is_mine: boolean; reply_to_id: number | null;
}

function fmtDateTime(dt: string | null): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('ro-RO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function convoName(c: Conversation): string {
  return c.is_group ? (c.group_name || 'Grup') : c.other_user_name;
}

export default function FioriChat({ user }: { user: User }) {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConvos = useCallback(() => {
    setLoadingConvos(true);
    apiCommand<Conversation[]>('get_chat_conversations')
      .then(setConvos)
      .catch(e => setError(e instanceof Error ? e.message : 'Eroare la încărcarea conversațiilor'))
      .finally(() => setLoadingConvos(false));
  }, []);

  const loadMessages = useCallback((convoId: number) => {
    setLoadingMsgs(true);
    apiCommand<Message[]>('get_chat_messages', { conversation_id: convoId })
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
    apiCommand('mark_chat_read', { conversation_id: convoId }).catch(() => {});
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  useEffect(() => {
    if (activeConvo == null) { setMessages([]); return; }
    loadMessages(activeConvo);
  }, [activeConvo, loadMessages]);

  const activeConvoData = useMemo(
    () => convos.find(c => c.id === activeConvo) ?? null,
    [convos, activeConvo],
  );

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || activeConvo == null || !activeConvoData) return;
    setSending(true);
    setError(null);
    const base: Record<string, unknown> = { conversation_id: activeConvo };
    if (!activeConvoData.is_group) base.to_user_id = activeConvoData.other_user_id;
    try {
      await apiCommand<Message>('send_chat_message', {
        ...base, content: trimmed, message_type: 'text',
      });
      setInput('');
      loadMessages(activeConvo);
      loadConvos();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mesajul nu a putut fi trimis');
    } finally {
      setSending(false);
    }
  }, [input, activeConvo, activeConvoData, loadMessages, loadConvos]);

  const columns = useMemo<AnalyticalTableColumnDefinition[]>(() => [
    {
      Header: 'Conversație',
      accessor: 'name',
      minWidth: 200,
      Cell: ({ row }: AnalyticalTableCellInstance) => convoName(row.original as Conversation),
    },
    {
      Header: 'Tip',
      accessor: 'is_group',
      width: 110,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value ? 'Grup' : 'Direct'),
    },
    {
      Header: 'Ultimul mesaj',
      accessor: 'last_message',
      minWidth: 220,
      Cell: ({ value }: AnalyticalTableCellInstance) => (value as string) || '—',
    },
    {
      Header: 'Data',
      accessor: 'last_message_at',
      width: 170,
      Cell: ({ value }: AnalyticalTableCellInstance) => fmtDateTime(value as string | null),
    },
    {
      Header: 'Necitite',
      accessor: 'unread_count',
      width: 130,
      Cell: ({ value }: AnalyticalTableCellInstance) => {
        const n = Number(value) || 0;
        return <ObjectStatus state={statusState(n > 0 ? 'asteptare' : 'ok')}>{n > 0 ? `${n} noi` : 'citit'}</ObjectStatus>;
      },
    },
  ], []);

  const rows = useMemo(
    () => convos.map(c => ({ ...c, name: convoName(c) })),
    [convos],
  );

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Mesagerie</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
            Mesaje interne · {user.username}
          </span>
          <Button design="Transparent" onClick={loadConvos}>Reîmprospătează</Button>
        </div>

        {error && (
          <MessageStrip design="Negative" onClose={() => setError(null)}>{error}</MessageStrip>
        )}

        <Card header={<CardHeader titleText="Conversații" subtitleText={`${convos.length} conversații`} />}>
          {loadingConvos && convos.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <BusyIndicator active size="L" />
            </div>
          ) : (
            <AnalyticalTable
              data={rows}
              columns={columns}
              filterable
              sortable
              visibleRows={8}
              noDataText="Fără conversații"
              onRowClick={(e) => {
                const c = e?.detail?.row?.original as Conversation | undefined;
                if (c) setActiveConvo(c.id);
              }}
            />
          )}
        </Card>

        <Card
          header={
            <CardHeader
              titleText={activeConvoData ? convoName(activeConvoData) : 'Mesaje'}
              subtitleText={
                activeConvoData
                  ? (activeConvoData.is_group ? 'Grup' : activeConvoData.other_user_role)
                  : 'Selectează o conversație din tabel'
              }
            />
          }
        >
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeConvo == null ? (
              <span style={{ fontSize: '0.875rem', opacity: 0.6 }}>
                Selectează o conversație pentru a vedea mesajele.
              </span>
            ) : loadingMsgs && messages.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <BusyIndicator active size="L" />
              </div>
            ) : messages.length === 0 ? (
              <span style={{ fontSize: '0.875rem', opacity: 0.6 }}>Niciun mesaj.</span>
            ) : (
              <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                <Timeline>
                  {messages.map(m => (
                    <TimelineItem
                      key={m.id}
                      titleText={m.is_mine ? `${m.sender_name} (tu)` : m.sender_name}
                      subtitleText={fmtDateTime(m.created_at)}
                      icon={m.is_mine ? 'outgoing-call' : 'incoming-call'}
                    >
                      {m.message_type === 'file' && m.attachment_name
                        ? `📎 ${m.attachment_name}`
                        : m.content || '—'}
                    </TimelineItem>
                  ))}
                </Timeline>
              </div>
            )}

            {activeConvo != null && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Input
                  value={input}
                  placeholder="Scrie un mesaj…"
                  style={{ flex: 1 }}
                  onInput={(e) => setInput((e.target as unknown as { value: string }).value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { void handleSend(); } }}
                />
                <Button
                  design="Emphasized"
                  disabled={!input.trim() || sending}
                  onClick={() => { void handleSend(); }}
                >
                  Trimite
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DynamicPage>
  );
}
