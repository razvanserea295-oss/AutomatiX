#!/usr/bin/env node
/**
 * Re-runs the e2e smoke suite whenever src/ or electron/ changes.
 * Debounces file events so a batch save only triggers one run.
 *
 * Usage: npm run test:e2e:watch
 */

import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';

const WATCH_DIRS = ['src', 'electron'];
const DEBOUNCE_MS = 2_000;
const CMD = 'npm';
const ARGS = ['run', 'test:e2e'];

let timer = null;
let running = false;
let queued = false;

function runTests() {
  if (running) { queued = true; return; }
  running = true;
  console.log(`\n\x1b[36m[watch]\x1b[0m running tests at ${new Date().toTimeString().slice(0, 8)}...`);
  const child = spawn(CMD, ARGS, { stdio: 'inherit' });
  child.on('exit', (code) => {
    running = false;
    const mark = code === 0 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗ exit ' + code + '\x1b[0m';
    console.log(`\x1b[36m[watch]\x1b[0m done ${mark}`);
    if (queued) { queued = false; scheduleRun(); }
  });
}

function scheduleRun() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(runTests, DEBOUNCE_MS);
}

for (const dir of WATCH_DIRS) {
  const abs = path.resolve(dir);
  console.log(`\x1b[36m[watch]\x1b[0m watching ${abs}`);
  watch(abs, { recursive: true }, (_evt, file) => {
    if (!file) return;
    if (!/\.(ts|tsx|sql)$/.test(file)) return;
    scheduleRun();
  });
}

console.log('\x1b[36m[watch]\x1b[0m initial run...');
runTests();
