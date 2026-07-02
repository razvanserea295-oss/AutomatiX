import { useCallback, useEffect, useState } from 'react';
import { Send } from '@/icons';
import { toast } from 'sonner';
import { aiChat, aiHealth } from '@/api/ai';
import { Page, PageHeader, PageBody } from '@/v2/components/app/Page';
import { Button } from '@/v2/components/ui/button';
import { Textarea } from '@/v2/components/ui/textarea';
import { Card } from '@/v2/components/ui/card';
import { Badge } from '@/v2/components/ui/badge';

interface Msg { role: 'user' | 'assistant'; content: string }

export default function AiPage() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const sessionId = 'v2-ai';

  useEffect(() => {
    aiHealth().then(setOnline).catch(() => setOnline(false));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const reply = await aiChat(
        next.map((m) => ({ role: m.role, content: m.content })),
        sessionId,
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: reply.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI indisponibil');
    } finally {
      setSending(false);
    }
  }, [input, messages, sending]);

  return (
    <Page fill className="max-w-3xl">
      <PageHeader
        title="Asistent AI"
        description="Chat cu serviciul AI Promix"
        actions={<Badge variant={online ? 'default' : 'secondary'}>{online ? 'Online' : 'Offline'}</Badge>}
      />
      <PageBody>
        <Card className="flex min-h-0 flex-1 flex-col shadow-none">
          <div className="v2-panel-scroll max-h-[55vh] flex-1 space-y-2 p-[var(--density-card-p)]">
            {messages.length === 0 && (
              <p className="density-meta text-muted-foreground">Întreabă despre proiecte, stoc, oferte sau rapoarte.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-[length:var(--density-fs-body)] ${m.role === 'user' ? 'ml-8 bg-primary text-primary-foreground' : 'mr-8 bg-muted'}`}>
                {m.content}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t p-[var(--density-card-p)]">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrie un mesaj…"
              rows={2}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
            />
            <Button disabled={sending || !online} onClick={() => void send()}><Send className="h-4 w-4" /></Button>
          </div>
        </Card>
      </PageBody>
    </Page>
  );
}
