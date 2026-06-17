// Read-only API shape probe — logs in and prints the field shape of list
// commands so the rebuild can wire columns to real data. Usage:
//   node scripts/probe-api.mjs get_clients get_sales_leads list_quotations
import process from 'node:process';

const BASE = process.env.VERIFY_URL || 'http://localhost:3500';
const USER = process.env.VERIFY_USER || 'razvan';
const PASS = process.env.VERIFY_PASS || 'Razvan@2006';
const cmds = process.argv.slice(2);

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
}).then((r) => r.json());

const token = login.token;
const slug = login.tenant_slug;
const api = `${BASE}${slug ? '/t/' + slug : ''}/api/cmd`;
if (!token) { console.log('LOGIN FAILED', JSON.stringify(login)); process.exit(1); }
console.log('tenant:', slug || '(host)');

const BODY = JSON.parse(process.env.PROBE_BODY || '{}');
async function call(cmd, body = BODY) {
  const r = await fetch(`${api}/${cmd}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}

for (const cmd of cmds) {
  const { status, json } = await call(cmd);
  if (status !== 200) { console.log(`\n### ${cmd} → HTTP ${status}: ${JSON.stringify(json).slice(0, 200)}`); continue; }
  const arr = Array.isArray(json) ? json : (json && Array.isArray(json.items) ? json.items : null);
  if (arr) {
    console.log(`\n### ${cmd} → array(${arr.length})`);
    if (arr[0]) { console.log('keys:', Object.keys(arr[0]).join(', ')); console.log('sample:', JSON.stringify(arr[0]).slice(0, 600)); }
  } else if (json && typeof json === 'object') {
    console.log(`\n### ${cmd} → object`);
    console.log('keys:', Object.keys(json).join(', '));
    console.log('sample:', JSON.stringify(json).slice(0, 600));
  } else {
    console.log(`\n### ${cmd} → ${typeof json}: ${JSON.stringify(json).slice(0, 200)}`);
  }
}
