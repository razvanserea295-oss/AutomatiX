











import fs from 'fs';
import path from 'path';

export type ServerEventKind = 'STARTUP' | 'SHUTDOWN' | 'CRASH' | 'EXIT' | 'FATAL';

const LOG_DIR = process.env.PROMIX_LOG_DIR || path.join(process.cwd(), 'data', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'server-events.log');
const MAX_BYTES = 5 * 1024 * 1024; 

function serialize(detail: unknown): string {
  if (detail == null) return '';
  if (detail instanceof Error) return `${detail.name}: ${detail.message}\n${detail.stack ?? ''}`;
  if (typeof detail === 'string') return detail;
  try { return JSON.stringify(detail); } catch { return String(detail); }
}

function rotateIfNeeded(): void {
  try {
    const st = fs.statSync(LOG_FILE);
    if (st.size > MAX_BYTES) fs.renameSync(LOG_FILE, `${LOG_FILE}.1`); 
  } catch {  }
}





export function logServerEvent(kind: ServerEventKind, message: string, detail?: unknown): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    rotateIfNeeded();
    const ts = new Date().toISOString();
    const d = serialize(detail);
    const indented = d ? `\n    ${d.replace(/\n/g, '\n    ')}` : '';
    fs.appendFileSync(LOG_FILE, `[${ts}] [${kind}] pid=${process.pid} ${message}${indented}\n`);
  } catch {  }
}


export function getServerLogPath(): string { return LOG_FILE; }
