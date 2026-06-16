
















const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
process.chdir(root); 

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

// Resolve the firm's business type from the registry so the running backend can
// surface it (via /api/health) and the frontend can branch its navigation
// (restaurant tenants get restaurant workspaces, etc.). Defaults to manufacturing.
let businessType = process.env.PROMIX_BUSINESS_TYPE || '';
if (!businessType) {
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(root, 'tenants', 'registry.json'), 'utf8'));
    const t = (reg.tenants || []).find((x) => x.slug === slug);
    if (t && t.business_type) businessType = t.business_type;
  } catch { /* no registry → default below */ }
}
if (!businessType) businessType = 'manufacturing';

process.env.PROMIX_TENANT = '1';
process.env.PROMIX_RUN_DEMO = '0';
process.env.PROMIX_DATA_DIR = dataDir;
process.env.PROMIX_PORT = String(port);
process.env.PROMIX_TENANT_NAME = name;
process.env.PROMIX_BUSINESS_TYPE = businessType;

console.log(`[tenant] ${name} (${slug}) on :${port} [${businessType}] — data: ${dataDir}${fresh ? '  [provisioning fresh blank install]' : ''}`);


require(path.join(root, 'dist-server', 'server', 'index.js'));
