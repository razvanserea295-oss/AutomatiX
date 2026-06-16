/*
 * tenant-ctl.cjs — multi-tenant control plane.
 *
 *   node scripts/tenant-ctl.cjs list
 *   node scripts/tenant-ctl.cjs add <slug> "<Company Name>" [port] [domain]
 *   node scripts/tenant-ctl.cjs start <slug>
 *   node scripts/tenant-ctl.cjs start-all
 *   node scripts/tenant-ctl.cjs ingress     # Cloudflare ingress for all tenants
 *
 * Registry: tenants/registry.json. Each tenant runs as its own process (own DB +
 * key + port + subdomain) via serve-tenant.cjs. Production (:3500) is separate.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
const REG = path.join(root, 'tenants', 'registry.json');
const BASE_PORT = 3501;
const BASE_DOMAIN = process.env.PROMIX_BASE_DOMAIN || 'automatix.online';

function load() {
  try { return JSON.parse(fs.readFileSync(REG, 'utf8')); } catch { return { tenants: [] }; }
}
function save(r) {
  fs.mkdirSync(path.dirname(REG), { recursive: true });
  fs.writeFileSync(REG, JSON.stringify(r, null, 2) + '\n');
}
function nextPort(reg) {
  const used = new Set(reg.tenants.map((t) => t.port));
  let p = BASE_PORT;
  while (used.has(p)) p++;
  return p;
}
function startTenant(t) {
  const child = cp.spawn(process.execPath, [path.join(root, 'scripts', 'serve-tenant.cjs'), t.slug, String(t.port), t.name], {
    detached: true, stdio: 'ignore', windowsHide: true,
  });
  child.unref();
  console.log(`[tenant-ctl] started ${t.name} on :${t.port} (${t.domain})`);
}

const reg = load();
const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'list') {
  if (!reg.tenants.length) console.log('(no tenants registered)');
  for (const t of reg.tenants) console.log(`  ${t.slug.padEnd(18)} :${t.port}  ${String(t.domain).padEnd(34)} "${t.name}"`);

} else if (cmd === 'add') {
  const slug = args[0];
  const name = args[1];
  const port = args[2] ? Number(args[2]) : nextPort(reg);
  const domain = args[3] || `${slug}.${BASE_DOMAIN}`;
  if (!slug || !name) { console.error('Usage: tenant-ctl add <slug> "<Company Name>" [port] [domain]'); process.exit(1); }
  if (reg.tenants.find((t) => t.slug === slug)) { console.error(`slug '${slug}' already exists`); process.exit(1); }
  if (reg.tenants.find((t) => t.port === port)) { console.error(`port ${port} already in use`); process.exit(1); }
  reg.tenants.push({ slug, name, port, domain });
  save(reg);
  console.log(`added '${slug}' → :${port} (${domain}).`);
  console.log(`start it:  node scripts/tenant-ctl.cjs start ${slug}`);
  console.log(`route it:  node scripts/tenant-ctl.cjs ingress  (merge into deploy/cloudflared/config.yml + add a DNS CNAME)`);

} else if (cmd === 'start') {
  const t = reg.tenants.find((x) => x.slug === args[0]);
  if (!t) { console.error(`unknown tenant '${args[0]}'`); process.exit(1); }
  startTenant(t);

} else if (cmd === 'start-all') {
  if (!reg.tenants.length) console.log('(no tenants to start)');
  for (const t of reg.tenants) startTenant(t);

} else if (cmd === 'ingress') {
  console.log('# Cloudflare Tunnel ingress for tenants — merge ABOVE the catch-all in deploy/cloudflared/config.yml.');
  console.log('# Add a DNS CNAME per hostname pointing at the tunnel.');
  for (const t of reg.tenants) {
    console.log(`  - hostname: ${t.domain}`);
    console.log(`    service: http://localhost:${t.port}`);
  }

} else {
  console.log('Usage: node scripts/tenant-ctl.cjs <list|add|start|start-all|ingress>');
}
