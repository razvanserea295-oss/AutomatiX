










import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const children = [];

function run(cmd, args, env) {
  const c = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  children.push(c);
  c.on('exit', (code) => {
    if (code && code !== 0) shutdown(code);
  });
  return c;
}

function shutdown(code = 0) {
  for (const c of children) { try { c.kill(); } catch {  } }
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));


run(npx, ['vite']);


run(npx, ['tsc', '-p', 'tsconfig.server.json'], {});
run('node', ['dist-server/server/index.js'], { PROMIX_RATE_LIMIT_OFF: '1', PROMIX_PORT: '3500' });


run(npx, ['tsc', '-p', 'tsconfig.electron.json']);
setTimeout(() => {
  run(npx, ['electron', '.'], {
    ELECTRON_RENDERER_URL: 'http://localhost:1420',
    ELECTRON_START_SERVER: '0',
    ELECTRON_DEVTOOLS: '1',
    PROMIX_PORT: '3500',
  });
}, 4000);
