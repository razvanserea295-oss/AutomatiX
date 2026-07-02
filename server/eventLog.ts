











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

// Shared sink: append one `[ts] [TAG] pid=… message` line (+ indented detail) to
// the rotating log file. Never throws — logging must not take the process down.
function writeLine(tag: string, message: string, detail?: unknown): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    rotateIfNeeded();
    const ts = new Date().toISOString();
    const d = serialize(detail);
    const indented = d ? `\n    ${d.replace(/\n/g, '\n    ')}` : '';
    fs.appendFileSync(LOG_FILE, `[${ts}] [${tag}] pid=${process.pid} ${message}${indented}\n`);
  } catch {  }
}

export function logServerEvent(kind: ServerEventKind, message: string, detail?: unknown): void {
  writeLine(kind, message, detail);
}


// ── Leveled structured logger ────────────────────────────────────────────────
// Same rotating file as logServerEvent, plus a console transport. Level gated by
// LOG_LEVEL (debug|info|warn|error, default info). Use this for application logs
// in place of raw console.* on the high-value error/warn paths.
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentThreshold(): number {
  const raw = String(process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[raw as LogLevel] ?? LEVELS.info;
}

function emit(level: LogLevel, message: string, detail?: unknown): void {
  if (LEVELS[level] < currentThreshold()) return;
  writeLine(level.toUpperCase(), message, detail);
  // Console transport — keep stdout/stderr semantics (warn/error → stderr).
  const consoleFn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info;
  if (detail === undefined) consoleFn(message);
  else consoleFn(message, detail);
}

export const logger = {
  debug: (message: string, detail?: unknown) => emit('debug', message, detail),
  info: (message: string, detail?: unknown) => emit('info', message, detail),
  warn: (message: string, detail?: unknown) => emit('warn', message, detail),
  error: (message: string, detail?: unknown) => emit('error', message, detail),
};


export function getServerLogPath(): string { return LOG_FILE; }
