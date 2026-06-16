





















import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Trash2, Wrench, Zap, Plus, MessageSquare } from 'lucide-react';
import { aiChat, aiHealth, aiQueueDepth } from '@/api/ai';
import { fireConfetti } from '@/lib/confetti';
import type { AiMessage, AiChatResponse } from '@/api/ai';
import type { User } from '@/core/types';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';





interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolsUsed?: string[];
  iterations?: number;
}

interface Conversation {
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

interface AIAssistantPageProps {
  user: User | null;
}





const STORAGE_KEY = 'promix_ai_conversations_v2';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; 

function loadAll(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr: Conversation[] = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    
    const fresh = arr.filter(c => Date.now() - c.updatedAt < TTL_MS);
    if (fresh.length !== arr.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveAll(list: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    
  }
}

function makeSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}


function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return 'Conversație nouă';
  const trimmed = firstUser.content.trim().split('\n')[0];
  return trimmed.length > 48 ? trimmed.slice(0, 47) + '…' : (trimmed || 'Conversație nouă');
}


function groupConversations(list: Conversation[]): Array<{ label: string; items: Conversation[] }> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
  const todayMs = today.getTime();
  const yesterdayMs = yesterday.getTime();
  const groups: Record<string, Conversation[]> = { 'Astăzi': [], 'Ieri': [], 'Mai vechi': [] };
  for (const c of list) {
    if (c.updatedAt >= todayMs) groups['Astăzi'].push(c);
    else if (c.updatedAt >= yesterdayMs) groups['Ieri'].push(c);
    else groups['Mai vechi'].push(c);
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}





export default function AIAssistantPage(_props: AIAssistantPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadAll());
  const [activeId, setActiveId] = useState<string>(() => {
    const list = loadAll();
    return list[0]?.sessionId || makeSessionId();
  });

  const active = useMemo(
    () => conversations.find(c => c.sessionId === activeId) ?? null,
    [conversations, activeId],
  );
  const messages = active?.messages ?? [];

  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  
  
  
  
  const [queueDepth, setQueueDepth] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  
  useEffect(() => {
    let cancelled = false;
    const tick = () => aiHealth().then((ok) => { if (!cancelled) setConnected(ok); });
    tick();
    const interval = setInterval(tick, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  
  
  
  
  useEffect(() => {
    if (!sending) {
      setQueueDepth(0);
      setElapsedSec(0);
      return;
    }
    const startedAt = Date.now();
    const tick = () => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    const elapsedTimer = setInterval(tick, 1000);
    let cancelled = false;
    const pollQueue = async () => {
      const snap = await aiQueueDepth();
      if (cancelled) return;
      
      
      if (snap) setQueueDepth(Math.max(0, snap.active - 1));
    };
    void pollQueue();
    const queueTimer = setInterval(() => { void pollQueue(); }, 2000);
    return () => {
      cancelled = true;
      clearInterval(elapsedTimer);
      clearInterval(queueTimer);
    };
  }, [sending]);

  const persistConvo = useCallback((updater: (prev: Conversation[]) => Conversation[]) => {
    setConversations(prev => {
      const next = updater(prev);
      saveAll(next);
      return next;
    });
  }, []);

  const handleNewConversation = useCallback(() => {
    const newId = makeSessionId();
    setActiveId(newId);
    setError(null);
    setInputValue('');
    textareaRef.current?.focus();
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    persistConvo(prev => prev.filter(c => c.sessionId !== id));
    if (id === activeId) {
      const remaining = conversations.filter(c => c.sessionId !== id);
      setActiveId(remaining[0]?.sessionId || makeSessionId());
    }
  }, [activeId, conversations, persistConvo]);

  const handleClearActive = useCallback(() => {
    if (!active) return;
    handleDeleteConversation(active.sessionId);
  }, [active, handleDeleteConversation]);

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(160, ta.scrollHeight)}px`;
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}-u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    
    persistConvo(prev => {
      const existing = prev.find(c => c.sessionId === activeId);
      const newMessages = [...(existing?.messages ?? []), userMsg];
      const convo: Conversation = {
        sessionId: activeId,
        title: deriveTitle(newMessages),
        messages: newMessages,
        updatedAt: Date.now(),
      };
      const others = prev.filter(c => c.sessionId !== activeId);
      return [convo, ...others];
    });

    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setSending(true);
    setError(null);

    try {
      
      const threadForAi: AiMessage[] = [
        ...messages.map(m => ({ role: m.role, content: m.content } as AiMessage)),
        { role: 'user', content: text },
      ];
      const reply: AiChatResponse = await aiChat(threadForAi, activeId);

      const botMsg: ChatMessage = {
        id: `m-${Date.now()}-a`,
        role: 'assistant',
        content: reply.reply || '(răspuns gol)',
        timestamp: Date.now(),
        toolsUsed: reply.tools_used,
        iterations: reply.iterations,
      };

      persistConvo(prev => prev.map(c =>
        c.sessionId === activeId
          ? { ...c, messages: [...c.messages, botMsg], updatedAt: Date.now(), title: deriveTitle([...c.messages, botMsg]) }
          : c,
      ));

      
      if ((reply.iterations ?? 0) > 1) fireConfetti();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la trimitere');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [inputValue, sending, activeId, messages, persistConvo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  const groups = useMemo(() => groupConversations(conversations), [conversations]);

  const statusDot =
    connected === true ? 'bg-status-green' :
    connected === false ? 'bg-status-red' :
    'bg-content-muted';
  const statusLabel =
    connected === true ? 'Conectat' :
    connected === false ? 'Deconectat' :
    'Verifică...';

  return (
    
    
    <Page className="!overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {}
        <aside className="w-64 shrink-0 border-r border-line bg-surface-secondary flex flex-col min-h-0">
          <div className="px-3 py-2.5 border-b border-line">
            <Button size="sm" className="w-full" onClick={handleNewConversation}>
              <Plus className="h-3.5 w-3.5" /> Conversație nouă
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-pm-xs text-content-muted italic text-center py-6 px-3">
                Nicio conversație încă. Pune o întrebare în dreapta.
              </p>
            ) : (
              groups.map(group => (
                <div key={group.label} className="py-1.5">
                  <p className="px-3 py-1 text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">
                    {group.label}
                  </p>
                  <ul>
                    {group.items.map(c => (
                      <li key={c.sessionId} className="group/item">
                        <button
                          type="button"
                          onClick={() => setActiveId(c.sessionId)}
                          className={`w-full text-left flex items-start gap-2 px-3 py-2 hover:bg-surface-tertiary/50 transition-colors ${
                            c.sessionId === activeId ? 'bg-accent/5 border-l-2 border-l-accent' : ''
                          }`}
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-content-muted shrink-0 mt-0.5" />
                          <span className="flex-1 text-pm-xs text-content-primary truncate">{c.title}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.sessionId); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDeleteConversation(c.sessionId); } }}
                            className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 text-content-muted hover:text-status-red"
                            title="Șterge conversația"
                          >
                            <Trash2 className="h-3 w-3" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </aside>

        {}
        {


}
        <section className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface-primary">
          {}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface-secondary shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Bot className="h-4 w-4 text-accent shrink-0" />
              <h1 className="text-sm font-semibold text-content-primary truncate">
                {active?.title || 'AI Assistant'}
              </h1>
              <div className="flex items-center gap-1.5 shrink-0" title={statusLabel}>
                <span className={`inline-block h-2 w-2 rounded-full ${statusDot}`} />
                <span className="text-xs text-content-muted">{statusLabel}</span>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearActive}
                className="border border-line px-2.5 py-1 text-pm-2xs font-semibold text-content-secondary hover:bg-surface-tertiary transition-colors flex items-center gap-1 shrink-0"
                title="Șterge conversația activă"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Șterge
              </button>
            )}
          </div>

          {}
          {
}
          <div ref={chatScrollRef} className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
            {messages.length === 0 && (
              <div className="flex flex-1 items-center justify-center h-full">
                <div className="text-center max-w-md px-6">
                  <Bot className="mx-auto mb-3 h-10 w-10 text-content-muted" aria-hidden />
                  <p className="text-sm text-content-muted">Începeți o conversație cu asistentul AI.</p>
                  <p className="mt-1 text-xs text-content-muted">
                    Poate interoga baza de date, citi fișiere și executa acțiuni în ERP.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) =>
              
              
              
              
              
              
              
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end border-b border-line/30 px-4 py-3">
                  <div className="flex max-w-[75%] min-w-0 items-start gap-2">
                    <div className="bg-accent/10 p-3 min-w-0">
                      <p className="whitespace-pre-wrap break-words text-sm text-content-primary">{msg.content}</p>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20">
                      <UserIcon className="h-3.5 w-3.5 text-accent" aria-hidden />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="border-b border-line/30 px-4 py-3">
                  <div className="flex max-w-[75%] min-w-0 items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20">
                      <Bot className="h-3.5 w-3.5 text-accent" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="bg-surface-secondary border border-line p-3 min-w-0">
                        <p className="whitespace-pre-wrap break-words text-sm text-content-primary">{msg.content}</p>
                      </div>
                      {(msg.toolsUsed || msg.iterations) && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-1 mt-1.5">
                          {msg.toolsUsed?.map((tool) => (
                            <span
                              key={tool}
                              className="inline-flex items-center gap-1 bg-accent/10 text-accent text-pm-2xs px-2 py-0.5"
                            >
                              <Wrench className="h-2.5 w-2.5" aria-hidden />
                              {tool}
                            </span>
                          ))}
                          {msg.iterations && (
                            <span className="inline-flex items-center gap-1 bg-surface-secondary border border-line px-2 py-0.5 text-pm-2xs text-content-muted">
                              <Zap className="h-2.5 w-2.5" aria-hidden />
                              {msg.iterations} pași
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ),
            )}

            {sending && (
              <div className="px-4 py-3 border-b border-line/30">
                <div className="flex max-w-[75%] items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20">
                    <Bot className="h-3.5 w-3.5 text-accent" aria-hidden />
                  </div>
                  <div className="bg-surface-secondary border border-line p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" aria-label="Se generează răspunsul..." />
                      <span className="text-xs text-content-muted">
                        {queueDepth > 0
                          ? `AI ocupat — ${queueDepth} ${queueDepth === 1 ? 'cerere' : 'cereri'} în față de tine`
                          : elapsedSec < 5
                            ? 'Se gândește...'
                            : elapsedSec < 15
                              ? 'Procesează cererea (consultă baza de date)...'
                              : `Lucrează — ${elapsedSec}s scurse, mai durează puțin`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mx-4 my-3 bg-status-red/10 border border-status-red/20 p-3">
                <p className="text-sm text-status-red">{error}</p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {}
          <div className="flex gap-2 px-4 py-3 border-t border-line bg-surface-secondary shrink-0">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                resizeTextarea();
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Scrieți o întrebare... (Shift+Enter pentru linie nouă)"
              aria-label="Întrebare pentru AI"
              disabled={sending}
              className="min-h-[40px] max-h-[160px] flex-1 resize-none bg-surface-primary border border-line px-3 py-2.5 text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60 disabled:opacity-50"
            />
            <Button
              aria-label="Trimite mesaj"
              size="sm"
              onClick={() => void handleSend()}
              disabled={sending || !inputValue.trim()}
              className="self-end"
            >
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </section>
      </div>
    </Page>
  );
}
