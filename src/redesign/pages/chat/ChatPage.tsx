

import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  MessageCircle, Send as SendIcon, Plus, Search, Paperclip, X, Download,
  FileText, BarChart3, Users as UsersIcon, Check, CheckCheck, Image as ImageIcon,
  ChevronLeft, Eye, Camera, Edit2, Shield, ShieldCheck, UserMinus, UserPlus, Crown, CalendarDays,
} from '@/icons';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import Card from '@/redesign/ui/Card';
import EmptyState from '@/redesign/ui/EmptyState';
import { confirmDialog } from '@/redesign/ui/ConfirmDialog';
import { filterSearchInputCls, filterSearchIconCls } from '@/redesign/ui/filterControls';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';
import { PageChrome, DashboardLayout, PAGE_GRID_12 } from '@/app-ui';
import { toast } from '@/store/toastStore';

interface Conversation {
  id: number; other_user_id: number; other_user_name: string; other_user_role: string;
  last_message: string | null; last_message_at: string | null; last_sender_id: number | null;
  unread_count: number; is_group: boolean; group_name: string | null; group_members: string | null;
  group_avatar: string | null;
}

interface GroupMember {
  user_id: number;
  full_name: string;
  role_name: string;
  is_admin: boolean;
  is_creator: boolean;
}

interface GroupDetails {
  id: number;
  group_name: string;
  group_avatar: string | null;
  created_by: number;
  created_by_name: string;
  created_at: string;
  members: GroupMember[];
}

interface Message {
  id: number; conversation_id: number; sender_id: number; sender_name: string;
  content: string; message_type: string;
  attachment_name: string | null; attachment_data: string | null;
  reference_type: string | null; reference_id: number | null; reference_label: string | null;
  delivered_at: string | null; read_at: string | null; created_at: string;
  is_mine: boolean; reply_to_id: number | null;
}

interface UserItem { id: number; username: string; full_name: string; role_name: string; }

interface ChatPageProps { user: User | null; }

const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name);
const ROLE_COLORS: Record<string, string> = {
  admin:      '[background:var(--role-admin-solid)]',
  manager:    '[background:var(--role-manager-solid)]',
  marketer:   '[background:var(--role-marketer-solid)]',
  proiectant: '[background:var(--role-proiectant-solid)]',
  contabil:   '[background:var(--role-contabil-solid)]',
  hala:       '[background:var(--role-hala-solid)]',
};

function timeDisplay(dt: string) {
  const d = new Date(dt), now = new Date(), diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString('ro-RO', { weekday: 'short' });
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function downloadBlob(data: string, filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml',
  };
  const mime = mimeMap[ext] || 'application/octet-stream';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function StatusIcon({ msg }: { msg: Message }) {
  if (!msg.is_mine) return null;
  if (msg.read_at) return <CheckCheck className="h-3 w-3 text-status-blue" />;
  if (msg.delivered_at) return <CheckCheck className="h-3 w-3 text-content-muted" />;
  return <Check className="h-3 w-3 text-content-muted" />;
}

export default function ChatPage({ user }: ChatPageProps) {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<number[]>([]);
  const [pendingFiles, setPendingFiles] = useState<{ name: string; data: string }[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  
  const [groupSettings, setGroupSettings] = useState<GroupDetails | null>(null);
  const [groupSettingsLoading, setGroupSettingsLoading] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMembersIds, setAddMembersIds] = useState<number[]>([]);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myId = user?.id || 0;

  const loadConvos = useCallback(() => {
    apiCommand<Conversation[]>('get_chat_conversations').then(setConvos).catch(() => {});
  }, []);

  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (iv) return; loadConvos(); iv = setInterval(loadConvos, 5000); };
    const stop  = () => { if (iv) { clearInterval(iv); iv = null; } };
    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    const onFocus = () => loadConvos();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadConvos]);

  useEffect(() => {
    if (!activeConvo) { setMessages([]); return; }
    setLoadingMsgs(true);
    apiCommand<Message[]>('get_chat_messages', { conversation_id: activeConvo })
      .then(setMessages).catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
    apiCommand('mark_chat_read', { conversation_id: activeConvo }).catch(() => {});
  }, [activeConvo]);

  useEffect(() => {
    if (!activeConvo) return;
    let iv: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      apiCommand<Message[]>('get_chat_messages', { conversation_id: activeConvo }).then(setMessages).catch(() => {});
    };
    const start = () => { if (iv) return; tick(); iv = setInterval(tick, 3000); };
    const stop  = () => { if (iv) { clearInterval(iv); iv = null; } };
    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    const onFocus = () => tick();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [activeConvo]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (showNewChat || showNewGroup || showAddMembers) {
      apiCommand<UserItem[]>('get_users').then(u => setAllUsers(u.filter(x => x.id !== myId))).catch(() => {});
    }
  }, [showNewChat, showNewGroup, showAddMembers, myId]);

  const addFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1] || '';
      setPendingFiles(prev => [...prev, { name: file.name, data: b64 }]);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) addFile(new File([file], `screenshot-${Date.now()}.png`, { type: file.type }));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const files = e.dataTransfer?.files;
    if (files) Array.from(files).forEach(addFile);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    const convo = convos.find(c => c.id === activeConvo);
    const base: Record<string, unknown> = { conversation_id: activeConvo };
    if (convo && !convo.is_group) base.to_user_id = convo.other_user_id;

    for (const f of pendingFiles) {
      await apiCommand<Message>('send_chat_message', {
        ...base, content: f.name, message_type: 'file',
        attachment_name: f.name, attachment_data: f.data,
      }).catch(() => {});
    }
    setPendingFiles([]);

    if (trimmed) {
      await apiCommand<Message>('send_chat_message', {
        ...base, content: trimmed, message_type: 'text',
      }).catch(() => {});
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }

    if (activeConvo) {
      apiCommand<Message[]>('get_chat_messages', { conversation_id: activeConvo }).then(setMessages).catch(() => {});
    }
    loadConvos();
  };

  const startChat = async (userId: number) => {
    setShowNewChat(false);
    await apiCommand<Message>('send_chat_message', {
      to_user_id: userId, content: '\u{1F44B}', message_type: 'text',
    }).catch(() => {});
    loadConvos();
    setTimeout(() => {
      apiCommand<Conversation[]>('get_chat_conversations').then(cs => {
        const c = cs.find(x => !x.is_group && x.other_user_id === userId);
        if (c) setActiveConvo(c.id);
        setConvos(cs);
      });
    }, 500);
  };

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0) return;
    try {
      const g = await apiCommand<Conversation>('create_chat_group', { name: groupName.trim(), member_ids: groupMembers });
      setShowNewGroup(false); setGroupName(''); setGroupMembers([]);
      loadConvos();
      setActiveConvo(g.id);
      toast.success(`Grupul "${g.group_name}" a fost creat`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nu s-a putut crea grupul');
    }
  };

  const openGroupSettings = useCallback(async () => {
    if (!activeConvo) return;
    setGroupSettingsLoading(true);
    try {
      const details = await apiCommand<GroupDetails>('get_chat_group_details', { conversation_id: activeConvo });
      setGroupSettings(details);
      setGroupNameDraft(details.group_name);
      setEditingGroupName(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nu s-au putut încărca detaliile grupului');
      setGroupSettings(null);
    } finally {
      setGroupSettingsLoading(false);
    }
  }, [activeConvo]);

  const closeGroupSettings = useCallback(() => {
    setGroupSettings(null);
    setShowAddMembers(false);
    setAddMembersIds([]);
    setEditingGroupName(false);
  }, []);

  const isGroupCreator = !!groupSettings && myId === groupSettings.created_by;
  const isGroupAdmin = !!groupSettings && (
    isGroupCreator || groupSettings.members.some(m => m.user_id === myId && m.is_admin)
  );

  const saveGroupName = async () => {
    if (!groupSettings || !groupNameDraft.trim() || groupNameDraft.trim() === groupSettings.group_name) {
      setEditingGroupName(false);
      return;
    }
    try {
      const updated = await apiCommand<GroupDetails>('update_chat_group', {
        conversation_id: groupSettings.id, name: groupNameDraft.trim(),
      });
      setGroupSettings(updated);
      setEditingGroupName(false);
      loadConvos();
      toast.success('Nume actualizat');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la actualizare');
    }
  };

  const uploadGroupAvatar = async (file: File) => {
    if (!groupSettings) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(',')[1] || '';
      try {
        const updated = await apiCommand<GroupDetails>('update_chat_group', {
          conversation_id: groupSettings.id,
          avatar: `data:${file.type};base64,${b64}`,
        });
        setGroupSettings(updated);
        loadConvos();
        toast.success('Poza grupului a fost actualizată');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Eroare la upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleMemberAdmin = async (memberId: number, makeAdmin: boolean) => {
    if (!groupSettings) return;
    try {
      const updated = await apiCommand<GroupDetails>('set_chat_group_admin', {
        conversation_id: groupSettings.id, member_id: memberId, is_admin: makeAdmin,
      });
      setGroupSettings(updated);
      toast.success(makeAdmin ? 'Promovat ca admin' : 'Retras din admini');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    }
  };

  const removeMember = async (memberId: number, memberName: string) => {
    if (!groupSettings) return;
    if (!(await confirmDialog({
      title: 'Elimină membru',
      body: `Sigur vrei să elimini "${memberName}" din grup?`,
      confirmLabel: 'Elimină',
      danger: true,
    }))) return;
    try {
      const updated = await apiCommand<GroupDetails>('remove_chat_group_member', {
        conversation_id: groupSettings.id, member_id: memberId,
      });
      setGroupSettings(updated);
      toast.success('Utilizator eliminat');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    }
  };

  const addNewMembers = async () => {
    if (!groupSettings || addMembersIds.length === 0) return;
    try {
      const updated = await apiCommand<GroupDetails>('add_chat_group_members', {
        conversation_id: groupSettings.id, member_ids: addMembersIds,
      });
      setGroupSettings(updated);
      setShowAddMembers(false);
      setAddMembersIds([]);
      toast.success(`${addMembersIds.length} membri adăugați`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare');
    }
  };

  const filtered = search.trim()
    ? convos.filter(c => (c.is_group ? c.group_name : c.other_user_name)?.toLowerCase().includes(search.toLowerCase()))
    : convos;

  const activeConvoData = convos.find(c => c.id === activeConvo);

  const headerGroupAvatar =
    groupSettings && activeConvoData?.is_group && groupSettings.id === activeConvoData.id
      ? groupSettings.group_avatar
      : activeConvoData?.group_avatar ?? null;

  const selectConvo = (id: number) => {
    startMorphTransition(() => flushSync(() => setActiveConvo(id)), { dir: 'forward' });
  };
  const clearConvo = () => {
    startMorphTransition(() => flushSync(() => setActiveConvo(null)), { dir: 'back' });
  };

  return (
    <DashboardLayout
        chrome={(
          <PageChrome
            actions={
              <>
                <Button size="md" variant="outline" onClick={() => setShowNewGroup(true)}>
                  <UsersIcon className="h-4 w-4" /> Grup nou
                </Button>
                <Button size="md" onClick={() => setShowNewChat(true)}>
                  <Plus className="h-4 w-4" /> Conversație nouă
                </Button>
              </>
            }
            toolbar={(
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className={filterSearchIconCls} aria-hidden />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Caută conversații..."
                  className={filterSearchInputCls}
                />
              </div>
            )}
          />
        )}
      bodyClassName="overflow-hidden"
      contentClassName="flex flex-col flex-1 min-h-0"
      >
        <div className={PAGE_GRID_12}>
          <aside className="xl:col-span-4 min-w-0 min-h-0 flex flex-col">
            <Card padding="none" className="overflow-hidden flex flex-col flex-1 min-h-0 max-h-[60vh] xl:max-h-none">
              <div className="px-4 py-3 border-b border-line/70 flex items-center justify-between gap-2 shrink-0">
                <span className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">
                  Conversații
                </span>
                <span className="text-pm-2xs text-content-muted tabular-nums shrink-0">
                  {search.trim() ? `${filtered.length} / ${convos.length}` : convos.length}
                </span>
              </div>

              <div key={search.trim()} className="flex-1 min-h-0 overflow-y-auto stagger-in">
                {filtered.map(c => {
                  const name = c.is_group ? (c.group_name || 'Grup') : c.other_user_name;
                  const active = activeConvo === c.id;
                  const roleColor = ROLE_COLORS[c.other_user_role?.toLowerCase()] || 'bg-content-muted';
                  return (
                    <button key={c.id} onClick={() => selectConvo(c.id)}
                      style={{ viewTransitionName: active ? vtName('chat', c.id) : undefined }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] border-b border-line/40 ${
                        active ? 'bg-accent/5 border-l-2 border-l-accent vt-morph' : 'hover:bg-surface-tertiary'
                      }`}>
                      {c.is_group && c.group_avatar ? (
                        <img src={c.group_avatar} alt={name} loading="lazy" decoding="async" width={36} height={36} className="h-9 w-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-pm-2xs font-bold text-surface-primary ${
                          c.is_group ? 'bg-status-blue' : roleColor
                        }`}>
                          {c.is_group ? <UsersIcon className="h-4 w-4" /> : getInitials(name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs truncate ${c.unread_count > 0 ? 'font-semibold text-content-primary' : 'font-medium text-content-primary'}`}>{name}</span>
                          {c.last_message_at && <span className="text-pm-2xs text-content-muted tabular-nums shrink-0 ml-1">{timeDisplay(c.last_message_at)}</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className={`text-pm-2xs truncate flex-1 ${c.unread_count > 0 ? 'text-content-secondary font-medium' : 'text-content-muted'}`}>
                            {c.last_message || 'Niciun mesaj'}
                          </p>
                          {c.unread_count > 0 && (
                            <span className="anim-pop flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-accent text-[var(--color-on-accent)] text-pm-2xs font-bold tabular-nums">{c.unread_count}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <EmptyState
                    icon={MessageCircle}
                    title={convos.length === 0 ? 'Nicio conversație' : 'Niciun rezultat'}
                    description={convos.length === 0
                      ? 'Apasă „Conversație nouă" pentru a începe o discuție.'
                      : `Niciun rezultat pentru „${search}".`}
                  />
                )}
              </div>
            </Card>
          </aside>
          <section className="xl:col-span-8 min-w-0 min-h-0 flex flex-col">
            <Card
              padding="none"
              vtName={activeConvo ? vtName('chat', activeConvo) : undefined}
              className="overflow-hidden flex flex-col flex-1 min-h-[60vh] xl:min-h-0 relative"
              onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {!activeConvo ? (
                <div className="flex-1 flex items-center justify-center text-content-muted">
                  <div className="text-center px-6 py-16">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-25 anim-float" />
                    <p className="text-sm text-content-secondary">Selectează o conversație</p>
                    <p className="text-pm-xs mt-1 text-content-muted text-center max-w-xs mx-auto">
                      Alege o discuție din stânga sau apasă <span className="font-semibold text-content-secondary">Conversație nouă</span> pentru a începe.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="shrink-0 flex items-center gap-2.5 px-4 py-2.5 border-b border-line/70 bg-surface-primary">
                    <IconButton onClick={clearConvo} aria-label="Înapoi" className="xl:hidden">
                      <ChevronLeft className="h-4 w-4" />
                    </IconButton>
                    {headerGroupAvatar ? (
                      <img src={headerGroupAvatar} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-pm-2xs font-bold text-surface-primary ${
                        activeConvoData?.is_group ? 'bg-status-blue' : (ROLE_COLORS[activeConvoData?.other_user_role?.toLowerCase() ?? ''] || 'bg-content-muted')
                      }`}>
                        {activeConvoData?.is_group ? <UsersIcon className="h-4 w-4" /> : getInitials(activeConvoData?.other_user_name || '')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-content-primary truncate">
                        {activeConvoData?.is_group ? (activeConvoData.group_name || 'Grup') : activeConvoData?.other_user_name}
                      </p>
                      {activeConvoData?.is_group && activeConvoData.group_members && (
                        <p className="text-pm-2xs text-content-muted truncate">{activeConvoData.group_members}</p>
                      )}
                    </div>
                    {activeConvoData?.is_group && (
                      <IconButton onClick={() => void openGroupSettings()} aria-label="Setări grup" disabled={groupSettingsLoading}>
                        <Edit2 className="h-4 w-4" />
                      </IconButton>
                    )}
                  </div>
                  <div ref={messagesScrollRef} className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-3 bg-surface-primary">
                    {loadingMsgs && messages.length === 0 && (
                      <div className="space-y-2 animate-pulse" aria-hidden>
                        <div className="flex justify-start">
                          <div className="bg-surface-secondary border border-line rounded-2xl px-3 py-2 w-44 h-9" />
                        </div>
                        <div className="flex justify-end">
                          <div className="bg-accent/10 rounded-2xl px-3 py-2 w-56 h-9" />
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-surface-secondary border border-line rounded-2xl px-3 py-2 w-32 h-9" />
                        </div>
                        <div className="flex justify-end">
                          <div className="bg-accent/10 rounded-2xl px-3 py-2 w-40 h-12" />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                    {messages.map(m => (

                      <div key={m.id} className={`flex min-w-0 ${m.is_mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] min-w-0 ${m.is_mine ? 'items-end' : 'items-start'}`}>
                          {!m.is_mine && activeConvoData?.is_group && (
                            <p className="text-pm-2xs text-content-muted mb-0.5 px-1">{m.sender_name}</p>
                          )}
                          <div className={`px-3 py-2 rounded-2xl ${
                            m.is_mine ? 'bg-accent/10 text-content-primary' : 'bg-surface-secondary border border-line text-content-primary'
                          }`}>
                            {m.message_type === 'file' && m.attachment_name && isImage(m.attachment_name) && m.attachment_data && (
                              <button onClick={() => setPreviewImage(`data:image/${m.attachment_name!.split('.').pop()};base64,${m.attachment_data}`)}
                                className="block mb-1.5 overflow-hidden rounded-xl hover:opacity-90 transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
                                <img src={`data:image/${m.attachment_name.split('.').pop()};base64,${m.attachment_data}`}
                                  alt={m.attachment_name} loading="lazy" decoding="async" className="max-w-[280px] max-h-[200px] object-cover rounded-xl" />
                              </button>
                            )}
                            {m.message_type === 'file' && m.attachment_name && !isImage(m.attachment_name) && m.attachment_data && (
                              <button onClick={() => downloadBlob(m.attachment_data!, m.attachment_name!)}
                                className={`flex items-center gap-2 mb-1.5 px-2.5 py-2 rounded-xl border w-full min-w-0 ${
                                  m.is_mine ? 'border-accent/20 hover:bg-accent/5' : 'border-line hover:bg-surface-tertiary'
                                } transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]`}>
                                <FileText className="h-4 w-4 shrink-0" />
                                <div className="text-left min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{m.attachment_name}</p>
                                  <p className="text-pm-2xs text-content-muted">Click pentru descărcare</p>
                                </div>
                                <Download className="h-3.5 w-3.5 shrink-0 text-content-muted" />
                              </button>
                            )}
                            {(m.message_type === 'report' || m.message_type === 'link') && m.reference_label && (
                              <div className="flex items-center gap-2 mb-1.5 px-2 py-1.5 rounded-xl bg-accent/5">
                                <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-pm-2xs font-medium">{m.reference_label}</p>
                                  <p className="text-pm-2xs text-content-muted">{m.reference_type}</p>
                                </div>
                                <Eye className="h-3 w-3 shrink-0 text-content-muted" />
                              </div>
                            )}
                            {m.content && !(m.message_type === 'file' && m.attachment_name === m.content) && (
                              <p className="text-xs whitespace-pre-wrap break-words">{m.content}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 mt-0.5 px-1 ${m.is_mine ? 'justify-end' : ''}`}>
                            <span className="text-pm-2xs text-content-muted tabular-nums">{timeDisplay(m.created_at)}</span>
                            <StatusIcon msg={m} />
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                    <div ref={messagesEndRef} />
                  </div>
                  {dragging && (
                    <div className="absolute inset-0 bg-accent/5 border-2 border-dashed border-accent/30 rounded-2xl flex items-center justify-center z-10 pointer-events-none anim-fade-in">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-accent" />
                        <p className="text-sm font-medium text-accent">Trage fisierele aici</p>
                      </div>
                    </div>
                  )}
                  {pendingFiles.length > 0 && (
                    <div className="px-4 py-2 border-t border-line flex flex-wrap gap-1.5 shrink-0 bg-surface-secondary">
                      {pendingFiles.map((f, i) => (
                        <div key={i} className="anim-pop flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-tertiary text-xs text-content-primary">
                          {isImage(f.name) ? <ImageIcon className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                          <span className="truncate max-w-[120px]">{f.name}</span>
                          <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="inline-flex items-center justify-center rounded text-content-muted transition-smooth duration-150 hover:text-status-red active:scale-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-3 border-t border-line bg-surface-secondary shrink-0 flex items-end gap-2">
                    <IconButton intent="primary" onClick={() => fileInputRef.current?.click()} aria-label="Atașează fișier">
                      <Paperclip className="h-4 w-4" />
                    </IconButton>
                    <input ref={fileInputRef} type="file" className="hidden" multiple onChange={e => {
                      if (e.target.files) Array.from(e.target.files).forEach(addFile);
                      e.target.value = '';
                    }} />
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={e => { setInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                      onPaste={handlePaste}
                      rows={1}
                      placeholder="Scrie un mesaj... (Ctrl+V pt screenshot)"
                      className="flex-1 min-w-0 min-h-[36px] max-h-[120px] resize-none bg-surface-primary border border-line rounded-xl text-xs text-content-primary placeholder:text-content-muted transition-smooth duration-150 focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)] focus:shadow-[var(--ring-soft)] px-3 py-2"
                    />
                    <Button
                      size="sm"
                      onClick={() => void handleSend()}
                      disabled={!input.trim() && pendingFiles.length === 0}
                      aria-label="Trimite mesaj"
                      className={`shrink-0 ${(input.trim() || pendingFiles.length > 0) ? 'anim-glow' : ''}`}
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </section>
        </div>
        {showNewChat && (
          <aside className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-[400px] bg-surface-elevated border-l border-line rounded-l-2xl shadow-[var(--elevation-4)] flex flex-col anim-slide-in-right">
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 h-14 border-b border-line/70">
              <h2 className="text-pm-md font-semibold text-content-primary truncate">Conversatie noua</h2>
              <IconButton onClick={() => setShowNewChat(false)} aria-label="Închide"><X className="h-4 w-4" /></IconButton>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto stagger-in">
              {allUsers.map(u => (
                <button key={u.id} onClick={() => startChat(u.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-tertiary transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] border-b border-line/40">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-pm-2xs font-bold text-surface-primary shrink-0 ${
                    ROLE_COLORS[u.role_name?.toLowerCase()] || 'bg-content-muted'
                  }`}>{getInitials(u.full_name)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-content-primary truncate">{u.full_name}</p>
                    <p className="text-pm-2xs text-content-muted truncate">{u.role_name}</p>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        )}
        {showNewGroup && (
          <aside className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-[440px] bg-surface-elevated border-l border-line rounded-l-2xl shadow-[var(--elevation-4)] flex flex-col anim-slide-in-right">
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 h-14 border-b border-line/70">
              <h2 className="text-pm-md font-semibold text-content-primary truncate">Grup nou</h2>
              <IconButton onClick={() => setShowNewGroup(false)} aria-label="Închide"><X className="h-4 w-4" /></IconButton>
            </div>
            <div className="p-3 border-b border-line shrink-0">
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Numele grupului..."
                className="w-full h-9 border border-line rounded-xl bg-surface-primary px-3 text-xs text-content-primary placeholder:text-content-muted transition-smooth duration-150 focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)] focus:shadow-[var(--ring-soft)]" />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {allUsers.map(u => (
                <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-tertiary transition-smooth duration-150 cursor-pointer border-b border-line/40">
                  <input type="checkbox" checked={groupMembers.includes(u.id)}
                    onChange={e => setGroupMembers(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                    className="h-3.5 w-3.5 shrink-0 rounded border border-line accent-[var(--color-accent)] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]" />
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-pm-2xs font-bold text-surface-primary shrink-0 ${
                    ROLE_COLORS[u.role_name?.toLowerCase()] || 'bg-content-muted'
                  }`}>{getInitials(u.full_name)}</div>
                  <div className="min-w-0">
                    <p className="text-xs text-content-primary truncate">{u.full_name}</p>
                    <p className="text-pm-2xs text-content-muted truncate">{u.role_name}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="p-3 border-t border-line shrink-0">
              <Button block size="sm" onClick={createGroup} disabled={!groupName.trim() || groupMembers.length === 0}>
                Creeaza grup ({groupMembers.length} membri)
              </Button>
            </div>
          </aside>
        )}
        {(groupSettings || groupSettingsLoading) && (
          <aside className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-[440px] bg-surface-elevated border-l border-line rounded-l-2xl shadow-[var(--elevation-4)] flex flex-col anim-slide-in-right">
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 h-14 border-b border-line/70">
              <h2 className="text-pm-md font-semibold text-content-primary truncate">Detalii grup</h2>
              <IconButton onClick={closeGroupSettings} aria-label="Închide"><X className="h-4 w-4" /></IconButton>
            </div>

            {groupSettingsLoading && !groupSettings ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-pm-xs text-content-muted">
                <span className="h-5 w-5 rounded-full border-2 border-line border-t-accent animate-spin motion-reduce:animate-none" aria-hidden />
                <span>Se încarcă detaliile grupului…</span>
              </div>
            ) : groupSettings ? (
              !showAddMembers ? (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="flex flex-col items-center gap-3 px-4 pt-5 pb-4 border-b border-line/40">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-status-blue flex items-center justify-center overflow-hidden">
                        {groupSettings.group_avatar ? (
                          <img src={groupSettings.group_avatar} alt={groupSettings.group_name} className="h-full w-full object-cover" />
                        ) : (
                          <UsersIcon className="h-10 w-10 text-surface-primary" />
                        )}
                      </div>
                      {isGroupAdmin && (
                        <button
                          onClick={() => groupAvatarInputRef.current?.click()}
                          title="Schimbă poza"
                          className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-accent text-[var(--color-on-accent)] flex items-center justify-center shadow-[var(--elevation-2)] transition-smooth duration-150 hover:bg-accent/90 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <input
                        ref={groupAvatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) void uploadGroupAvatar(file);
                          e.target.value = '';
                        }}
                      />
                    </div>

                    {editingGroupName && isGroupAdmin ? (
                      <div className="w-full flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={groupNameDraft}
                          onChange={e => setGroupNameDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void saveGroupName();
                            if (e.key === 'Escape') { setEditingGroupName(false); setGroupNameDraft(groupSettings.group_name); }
                          }}
                          className="flex-1 min-w-0 h-8 border border-line rounded-xl bg-surface-primary px-2.5 text-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent focus-visible:shadow-[var(--ring-soft)] focus:shadow-[var(--ring-soft)]"
                        />
                        <Button size="sm" onClick={() => void saveGroupName()} disabled={!groupNameDraft.trim()}>Salvează</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-content-primary">{groupSettings.group_name}</p>
                        {isGroupAdmin && (
                          <button
                            onClick={() => { setEditingGroupName(true); setGroupNameDraft(groupSettings.group_name); }}
                            title="Editează"
                            className="inline-flex items-center justify-center p-1 rounded-lg text-content-muted transition-smooth duration-150 hover:text-accent active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="text-pm-2xs text-content-muted flex items-center gap-1.5">
                      <CalendarDays className="h-3 w-3" />
                      Creat de <span className="text-content-secondary font-medium">{groupSettings.created_by_name || '?'}</span>
                      {groupSettings.created_at && (
                        <>· {new Date(groupSettings.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}</>
                      )}
                    </div>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between border-b border-line/40">
                    <p className="text-pm-2xs uppercase tracking-wide font-semibold text-content-muted">
                      {groupSettings.members.length} membri
                    </p>
                    {isGroupAdmin && (
                      <button
                        onClick={() => { setShowAddMembers(true); setAddMembersIds([]); }}
                        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 -mr-1.5 text-pm-2xs text-accent transition-smooth duration-150 hover:underline active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                      >
                        <UserPlus className="h-3 w-3" /> Adaugă
                      </button>
                    )}
                  </div>
                  <ul className="stagger-in">
                    {groupSettings.members.map(m => (
                      <li key={m.user_id} className="group flex items-center gap-2.5 px-3 py-2 border-b border-line/40 hover:bg-surface-tertiary/40 transition-smooth duration-150">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-pm-2xs font-bold text-surface-primary shrink-0 ${
                          ROLE_COLORS[m.role_name?.toLowerCase()] || 'bg-content-muted'
                        }`}>{getInitials(m.full_name)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-content-primary truncate">{m.full_name}</p>
                            {m.is_creator && (
                              <span title="Creator"><Crown className="h-3 w-3 text-status-amber" /></span>
                            )}
                            {!m.is_creator && m.is_admin && (
                              <span title="Admin"><ShieldCheck className="h-3 w-3 text-status-blue" /></span>
                            )}
                            {m.user_id === myId && (
                              <span className="text-pm-2xs text-content-muted">(tu)</span>
                            )}
                          </div>
                          <p className="text-pm-2xs text-content-muted truncate">{m.role_name}</p>
                        </div>
                        {isGroupCreator && !m.is_creator && (
                          <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                            <IconButton
                              size="sm"
                              intent={m.is_admin ? 'warning' : 'primary'}
                              onClick={() => void toggleMemberAdmin(m.user_id, !m.is_admin)}
                              title={m.is_admin ? 'Retrage admin' : 'Promovează ca admin'}
                              aria-label={m.is_admin ? 'Retrage admin' : 'Promovează ca admin'}
                              className={m.is_admin ? 'text-status-blue' : undefined}
                            >
                              <Shield className="h-3.5 w-3.5" />
                            </IconButton>
                            <IconButton
                              size="sm"
                              intent="danger"
                              onClick={() => void removeMember(m.user_id, m.full_name)}
                              title="Elimină din grup"
                              aria-label="Elimină din grup"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                
                <>
                  <div className="p-3 border-b border-line shrink-0 flex items-center justify-between">
                    <button onClick={() => { setShowAddMembers(false); setAddMembersIds([]); }} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 -ml-1.5 text-pm-xs text-content-muted transition-smooth duration-150 hover:text-accent active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
                      <ChevronLeft className="h-3.5 w-3.5" /> Înapoi
                    </button>
                    <span className="text-pm-2xs text-content-muted">{addMembersIds.length} selectați</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {allUsers
                      .filter(u => !groupSettings.members.some(m => m.user_id === u.id))
                      .map(u => (
                        <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-tertiary transition-smooth duration-150 cursor-pointer border-b border-line/40">
                          <input
                            type="checkbox"
                            checked={addMembersIds.includes(u.id)}
                            onChange={e => setAddMembersIds(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                            className="h-3.5 w-3.5 shrink-0 rounded border border-line accent-[var(--color-accent)] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                          />
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-pm-2xs font-bold text-surface-primary shrink-0 ${
                            ROLE_COLORS[u.role_name?.toLowerCase()] || 'bg-content-muted'
                          }`}>{getInitials(u.full_name)}</div>
                          <div className="min-w-0">
                            <p className="text-xs text-content-primary truncate">{u.full_name}</p>
                            <p className="text-pm-2xs text-content-muted truncate">{u.role_name}</p>
                          </div>
                        </label>
                      ))}
                    {allUsers.filter(u => !groupSettings.members.some(m => m.user_id === u.id)).length === 0 && (
                      <p className="px-3 py-6 text-center text-pm-xs text-content-muted italic">
                        Toți utilizatorii sunt deja în grup.
                      </p>
                    )}
                  </div>
                  <div className="p-3 border-t border-line shrink-0">
                    <Button block size="sm" onClick={() => void addNewMembers()} disabled={addMembersIds.length === 0}>
                      Adaugă {addMembersIds.length} {addMembersIds.length === 1 ? 'membru' : 'membri'}
                    </Button>
                  </div>
                </>
              )
            ) : null}
          </aside>
        )}
        {previewImage && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer anim-fade-in" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-[var(--elevation-4)] anim-scale-in" />
            <button className="absolute top-4 right-4 inline-flex items-center justify-center h-9 w-9 rounded-xl text-surface-primary/80 transition-smooth duration-150 hover:text-surface-primary active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"><X className="h-6 w-6" /></button>
          </div>
        )}

    </DashboardLayout>
  );
}
