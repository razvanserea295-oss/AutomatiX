/*
 * serve-tenant.cjs — boot a PERSISTENT, isolated tenant instance.
 *
 * Usage:  node scripts/serve-tenant.cjs <slug> <port> ["Company Name"]
 *   e.g.  node scripts/serve-tenant.cjs zet-burgers 3501 "ZET Burgers"
 *
 * Each tenant gets its OWN data dir (tenants/<slug>/data → own promix.db,
 * .dbkey and backups), its OWN port, and — on the FIRST boot only — a BLANK
 * dataset branded with the company name (server/tenantInit.ts clears the demo
 * data the migration chain seeds). Unlike the demo launcher this PERSISTS: it
 * never wipes, and a tenant with real data is never reset (the blank init is
 * gated on a freshly-created DB).
 *
 * Put each tenant behind its own subdomain in the Cloudflare tunnel ingress
 * (company.automatix.online -> http://localhost:<port>); the browser client
 * already calls back to its own origin, so no client config is needed.
 */
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
process.chdir(root); // so migrations/ + dist-server/ resolve like the prod server

const slug = process.argv[2] || process.env.PROMIX_TENANT_SLUG;
const port = process.argv[3] || process.env.PROMIX_PORT;
const name = process.argv[4] || process.env.PROMIX_TENANT_NAME || slug;
if (!slug || !port) {
  console.error('Usage: node scripts/serve-tenant.cjs <slug> <port> ["Company Name"]');
  process.exit(1);
}

const tenantsRoot = process.env.PROMIX_TENANTS_ROOT || path.join(root, 'tenants');
const dataDir = path.join(tenantsRoot, slug, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const fresh = !fs.existsSync(path.join(dataDir, 'promix.db'));

process.env.PROMIX_TENANT = '1';
process.env.PROMIX_RUN_DEMO = '0';
process.env.PROMIX_DATA_DIR = dataDir;
process.env.PROMIX_PORT = String(port);
process.env.PROMIX_TENANT_NAME = name;

console.log(`[tenant] ${name} (${slug}) on :${port} — data: ${dataDir}${fresh ? '  [provisioning fresh blank install]' : ''}`);

// Build the backend first: tsc -p tsconfig.server.json
require(path.join(root, 'dist-server', 'server', 'index.js'));
