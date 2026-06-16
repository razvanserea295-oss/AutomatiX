#!/usr/bin/env node
/**
 * Uptime monitor for the local dev stack. Pings each endpoint on an interval
 * and reports status + latency. Runs until Ctrl+C.
 *
 * Usage: npm run monitor
 */

const endpoints = [
  { name: 'PROMIX server', url: 'http://127.0.0.1:3500/api/health' },
  { name: 'ai-service',    url: 'http://127.0.0.1:8100/health'     },
  { name: 'Vite dev',      url: 'http://127.0.0.1:1420/'           },
];

const intervalMs = Number(process.env.MONITOR_INTERVAL_MS) || 15_000;
const timeoutMs  = Number(process.env.MONITOR_TIMEOUT_MS)  || 3_000;

const state = new Map(endpoints.map((e) => [e.name, { up: false, changedAt: new Date() }]));

function fmt(d) { return d.toTimeString().slice(0, 8); }

async function probe(ep) {
  const started = Date.now();
  try {
    const res = await fetch(ep.url, { signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.ok, ms: Date.now() - started, status: res.status };
  } catch (err) {
    return { ok: false, ms: Date.now() - started, status: 0, error: err.message };
  }
}

async function tick() {
  const results = await Promise.all(endpoints.map(async (ep) => ({ ep, result: await probe(ep) })));
  const now = new Date();
  const line = [];
  let anyChanged = false;
  for (const { ep, result } of results) {
    const prev = state.get(ep.name);
    const up = result.ok;
    if (prev.up !== up) {
      prev.up = up;
      prev.changedAt = now;
      anyChanged = true;
    }
    const color = up ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    line.push(`${color}${ep.name}${reset}=${up ? `OK ${result.ms}ms` : `DOWN ${result.status || result.error}`}`);
  }
  const prefix = anyChanged ? '\x1b[1m[CHANGE]\x1b[0m ' : '';
  console.log(`${prefix}${fmt(now)} ${line.join('  ·  ')}`);
}

console.log(`[monitor] polling ${endpoints.length} endpoints every ${intervalMs / 1000}s (timeout ${timeoutMs / 1000}s)`);
await tick();
setInterval(() => { tick().catch(() => {}); }, intervalMs);
