// Tests for the structured server logger added on top of the lifecycle event log.
// LOG_DIR is captured at module load, so PROMIX_LOG_DIR is set before the dynamic
// import; LOG_LEVEL is read per-call, so it can be flipped between assertions.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

let logger: typeof import('./eventLog').logger;
let logServerEvent: typeof import('./eventLog').logServerEvent;
let logFile: string;

beforeAll(async () => {
  const dir = path.join(os.tmpdir(), `promix-log-test-${process.pid}`);
  fs.rmSync(dir, { recursive: true, force: true });
  process.env.PROMIX_LOG_DIR = dir;
  const mod = await import('./eventLog');
  logger = mod.logger;
  logServerEvent = mod.logServerEvent;
  logFile = mod.getServerLogPath();
});

function readLog(): string {
  try { return fs.readFileSync(logFile, 'utf8'); } catch { return ''; }
}

describe('logger', () => {
  it('writes an [ERROR] line with the message and serialized detail', () => {
    logger.error('boom happened', new Error('kaboom'));
    const out = readLog();
    expect(out).toContain('[ERROR]');
    expect(out).toContain('boom happened');
    expect(out).toContain('kaboom'); // Error serialized into the indented detail
  });

  it('respects LOG_LEVEL: below-threshold levels are dropped', () => {
    process.env.LOG_LEVEL = 'error';
    const marker = `dbg-${process.pid}-${performance.now()}`;
    logger.debug(marker);
    logger.info(marker);
    expect(readLog()).not.toContain(marker); // gated out at level=error

    process.env.LOG_LEVEL = 'debug';
    logger.debug(marker);
    expect(readLog()).toContain(marker); // now emitted
    delete process.env.LOG_LEVEL;
  });
});

describe('logServerEvent', () => {
  it('writes a lifecycle line tagged with its kind', () => {
    logServerEvent('STARTUP', 'service up');
    const out = readLog();
    expect(out).toContain('[STARTUP]');
    expect(out).toContain('service up');
  });
});
