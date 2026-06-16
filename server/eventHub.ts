

















import type { Response } from 'express';

export interface AppEvent {
  
  topic:
    | 'handoff.created'
    | 'handoff.updated'
    | 'project.updated'
    | 'project.created'
    | 'piece.updated'
    | 'alert.created'
    | 'alert.acknowledged'
    | 'briefing.updated';
  
  payload?: Record<string, unknown>;
  
  ts: number;
}

interface Subscriber {
  userId: number;
  res: Response;
  
  heartbeat: NodeJS.Timeout;
}

const subscribers = new Set<Subscriber>();





export function subscribe(userId: number, res: Response): () => void {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(`: connected user=${userId}\n\n`);

  
  
  const heartbeat = setInterval(() => {
    try { res.write(`: ping ${Date.now()}\n\n`); } catch {  }
  }, 25_000);

  const sub: Subscriber = { userId, res, heartbeat };
  subscribers.add(sub);

  return () => {
    clearInterval(sub.heartbeat);
    subscribers.delete(sub);
    try { res.end(); } catch {  }
  };
}






export function emit(event: Omit<AppEvent, 'ts'>, userIds?: number[]): void {
  const enriched: AppEvent = { ...event, ts: Date.now() };
  const data = `data: ${JSON.stringify(enriched)}\n\n`;
  for (const sub of subscribers) {
    if (userIds && !userIds.includes(sub.userId)) continue;
    try { sub.res.write(data); }
    catch {  }
  }
}

export function subscriberCount(): number { return subscribers.size; }
