import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Settings, Users } from '@/icons';
import { apiCommand } from '@/api/commands';
import { useAuthStore } from '@/store/authStore';
import { formatDateTimeRo } from '@/lib/format';
import { Page, PageHeader, PageBody, PageSplit, PagePanel } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Button } from '@/v2/components/ui/button';
import { Textarea } from '@/v2/components/ui/textarea';
import { Input } from '@/v2/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';
import { toast } from 'sonner';

type Conversation = {
  id: number;
  title?: string;
  other_user_name?: string;
  other_user_id?: number;
  is_group?: boolean;
  unread_count?: number;
};
type Message = { id: number; content: string; sender_name?: string; created_at: string };
type UserItem = { id: number; full_name: string; username: string };

interface GroupMember {
  user_id: number;
  full_name: string;
  is_admin: boolean;
}

interface GroupDetails {
  id: number;
  group_name: string;
  created_by: number;
  members: GroupMember[];
}

export default function ChatPage() {
  const myId = useAuthStore((s) => s.user?.id);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [newMode, setNewMode] = useState<'dm' | 'group'>('dm');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userQ, setUserQ] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<number[]>([]);
  const [groupSettings, setGroupSettings] = useState<GroupDetails | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [addMemberIds, setAddMemberIds] = useState<number[]>([]);

  const loadConvos = useCallback(() => {
    apiCommand<Conversation[]>('get_chat_conversations')
      .then((c) => setConvos(Array.isArray(c) ? c : []))
      .catch(() => setConvos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  useEffect(() => {
    if (!active) return;
    apiCommand<Message[]>('get_chat_messages', { conversation_id: active })
      .then((m) => setMessages(Array.isArray(m) ? m : []))
      .catch(() => setMessages([]));
    apiCommand('mark_chat_read', { conversation_id: active })
      .then(() => loadConvos())
      .catch(() => {});
  }, [active, loadConvos]);

  const openNewChat = () => {
    setNewMode('dm');
    setGroupName('');
    setGroupMembers([]);
    setNewOpen(true);
    apiCommand<UserItem[]>('get_users')
      .then((u) => setUsers(Array.isArray(u) ? u.filter((x) => x.id !== myId) : []))
      .catch(() => setUsers([]));
  };

  const toggleGroupMember = (id: number) => {
    setGroupMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0) {
      toast.error('Nume grup și cel puțin un membru sunt obligatorii');
      return;
    }
    try {
      const g = await apiCommand<Conversation & { group_name?: string }>('create_chat_group', {
        name: groupName.trim(),
        member_ids: groupMembers,
      });
      setNewOpen(false);
      setGroupName('');
      setGroupMembers([]);
      loadConvos();
      setActive(g.id);
      toast.success('Grup creat');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const startChat = async (userId: number) => {
    setNewOpen(false);
    try {
      await apiCommand('send_chat_message', {
        to_user_id: userId,
        content: '👋',
        message_type: 'text',
      });
      loadConvos();
      setTimeout(() => {
        apiCommand<Conversation[]>('get_chat_conversations').then((cs) => {
          const c = cs.find((x) => !x.is_group && x.other_user_id === userId);
          if (c) setActive(c.id);
          setConvos(cs);
        });
      }, 400);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const send = async () => {
    if (!active || !text.trim()) return;
    const convo = convos.find((c) => c.id === active);
    const base: Record<string, unknown> = { conversation_id: active, content: text.trim(), message_type: 'text' };
    if (convo && !convo.is_group && convo.other_user_id) base.to_user_id = convo.other_user_id;

    try {
      await apiCommand('send_chat_message', base);
      setText('');
      const m = await apiCommand<Message[]>('get_chat_messages', { conversation_id: active });
      setMessages(Array.isArray(m) ? m : []);
      loadConvos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const activeConvo = convos.find((c) => c.id === active);
  const isActiveGroup = !!activeConvo?.is_group;

  const openGroupSettings = async () => {
    if (!active) return;
    try {
      const d = await apiCommand<GroupDetails>('get_chat_group_details', { conversation_id: active });
      setGroupSettings(d);
      setGroupNameDraft(d.group_name);
      setAddMemberIds([]);
      apiCommand<UserItem[]>('get_users')
        .then((u) => setUsers(Array.isArray(u) ? u.filter((x) => x.id !== myId) : []))
        .catch(() => setUsers([]));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const saveGroupName = async () => {
    if (!groupSettings || !groupNameDraft.trim()) return;
    try {
      const updated = await apiCommand<GroupDetails>('update_chat_group', {
        conversation_id: groupSettings.id,
        name: groupNameDraft.trim(),
      });
      setGroupSettings(updated);
      loadConvos();
      toast.success('Nume actualizat');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const addMembersToGroup = async () => {
    if (!groupSettings || addMemberIds.length === 0) return;
    try {
      const updated = await apiCommand<GroupDetails>('add_chat_group_members', {
        conversation_id: groupSettings.id,
        member_ids: addMemberIds,
      });
      setGroupSettings(updated);
      setAddMemberIds([]);
      toast.success('Membri adăugați');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const filteredUsers = users.filter((u) => {
    const needle = userQ.trim().toLowerCase();
    if (!needle) return true;
    return [u.full_name, u.username].some((v) => (v || '').toLowerCase().includes(needle));
  });

  return (
    <Page fill>
      <PageHeader
        title="Mesaje"
        description={`${convos.length} conversații`}
        actions={
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => loadConvos()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={openNewChat}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />Nou
            </Button>
          </div>
        }
      />
      <PageBody>
        <PageSplit>
          <PagePanel scroll bodyClassName="divide-y">
            <AsyncContent loading={loading} error={null} empty={convos.length === 0}>
              {convos.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted/50 ${active === c.id ? 'bg-muted' : ''}`}
                >
                  <span className="truncate font-medium">
                    {c.is_group && <Users className="mr-1 inline h-3.5 w-3.5" />}
                    {c.title || c.other_user_name || `Conversație #${c.id}`}
                  </span>
                  {(c.unread_count ?? 0) > 0 && (
                    <span className="text-xs text-primary">{c.unread_count} necitite</span>
                  )}
                </button>
              ))}
            </AsyncContent>
          </PagePanel>
          <PagePanel className="flex flex-col">
            {!active ? (
              <p className="p-3 text-sm text-muted-foreground">Selectează o conversație sau începe una nouă.</p>
            ) : (
              <>
                {isActiveGroup && (
                  <div className="flex shrink-0 justify-end border-b px-2 py-1">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => void openGroupSettings()}>
                      <Settings className="mr-1.5 h-3.5 w-3.5" />Grup
                    </Button>
                  </div>
                )}
                <div className="v2-panel-scroll min-h-0 flex-1 space-y-1.5 p-2">
                  {messages.map((m) => (
                    <div key={m.id} className="rounded-md border px-2.5 py-1.5 text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">{m.sender_name}</p>
                        <p className="shrink-0 text-[10px] text-muted-foreground">{formatDateTimeRo(m.created_at)}</p>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  ))}
                </div>
                <div className="flex shrink-0 gap-2 border-t p-2">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Scrie un mesaj…"
                    rows={2}
                    className="min-h-[2.5rem] flex-1 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <Button size="sm" className="self-end" onClick={() => void send()}>Trimite</Button>
                </div>
              </>
            )}
          </PagePanel>
        </PageSplit>
      </PageBody>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Conversație nouă</DialogTitle></DialogHeader>
          <div className="mb-3 flex gap-2">
            <Button size="sm" variant={newMode === 'dm' ? 'default' : 'outline'} onClick={() => setNewMode('dm')}>
              Direct
            </Button>
            <Button size="sm" variant={newMode === 'group' ? 'default' : 'outline'} onClick={() => setNewMode('group')}>
              Grup
            </Button>
          </div>
          {newMode === 'group' && (
            <Input
              className="mb-2"
              placeholder="Nume grup…"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}
          <input
            className="mb-2 h-9 w-full rounded-md border px-3 text-sm"
            placeholder="Caută utilizator…"
            value={userQ}
            onChange={(e) => setUserQ(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto divide-y">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                className="flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-muted/50"
                onClick={() => newMode === 'dm' ? void startChat(u.id) : toggleGroupMember(u.id)}
              >
                <span>
                  <span className="font-medium">{u.full_name || u.username}</span>
                  {u.full_name && <span className="ml-2 text-muted-foreground">@{u.username}</span>}
                </span>
                {newMode === 'group' && groupMembers.includes(u.id) && (
                  <span className="text-xs text-primary">✓</span>
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Închide</Button>
            {newMode === 'group' && (
              <Button onClick={() => void createGroup()}>Creează grup</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!groupSettings} onOpenChange={(o) => !o && setGroupSettings(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Setări grup</DialogTitle></DialogHeader>
          {groupSettings && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input value={groupNameDraft} onChange={(e) => setGroupNameDraft(e.target.value)} />
                <Button size="sm" onClick={() => void saveGroupName()}>Salvează</Button>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Membri ({groupSettings.members.length})</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {groupSettings.members.map((m) => (
                    <p key={m.user_id} className="text-sm">
                      {m.full_name}{m.is_admin ? ' · admin' : ''}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Adaugă membri</p>
                <div className="max-h-32 overflow-y-auto divide-y">
                  {users
                    .filter((u) => !groupSettings.members.some((m) => m.user_id === u.id))
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="flex w-full items-center justify-between px-2 py-1.5 text-sm hover:bg-muted/50"
                        onClick={() => setAddMemberIds((prev) =>
                          prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id],
                        )}
                      >
                        <span>{u.full_name || u.username}</span>
                        {addMemberIds.includes(u.id) && <span className="text-primary text-xs">✓</span>}
                      </button>
                    ))}
                </div>
                {addMemberIds.length > 0 && (
                  <Button size="sm" className="mt-2" onClick={() => void addMembersToGroup()}>
                    Adaugă ({addMemberIds.length})
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupSettings(null)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
