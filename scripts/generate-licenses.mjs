#!/usr/bin/env node










import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function collectNpmLicenses() {
  const pkg = readJson(path.join(root, 'package.json'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const out = [];

  for (const name of Object.keys(deps)) {
    const pkgPath = path.join(root, 'node_modules', name, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    try {
      const p = readJson(pkgPath);
      out.push({
        ecosystem: 'npm',
        name: p.name ?? name,
        version: p.version ?? deps[name],
        license: p.license ?? (Array.isArray(p.licenses) ? p.licenses.map(l => l.type).join(' / ') : 'UNKNOWN'),
        author: typeof p.author === 'string' ? p.author : p.author?.name ?? '',
        homepage: p.homepage ?? p.repository?.url ?? '',
      });
    } catch {
      out.push({ ecosystem: 'npm', name, version: deps[name], license: 'UNKNOWN' });
    }
  }
  return out;
}







function collectCargoPackages() {
  const lockPath = path.join(root, 'ai-service', 'Cargo.lock');
  if (!fs.existsSync(lockPath)) return [];
  const txt = fs.readFileSync(lockPath, 'utf-8');
  const packages = [];
  const blocks = txt.split(/\n\[\[package\]\]\n/);
  for (const block of blocks) {
    const nameMatch = block.match(/^name\s*=\s*"([^"]+)"/m);
    const versionMatch = block.match(/^version\s*=\s*"([^"]+)"/m);
    const sourceMatch = block.match(/^source\s*=\s*"([^"]+)"/m);
    if (nameMatch && versionMatch) {
      packages.push({
        ecosystem: 'cargo',
        name: nameMatch[1],
        version: versionMatch[1],
        license: '',
        author: '',
        homepage: sourceMatch ? sourceMatch[1] : '',
      });
    }
  }
  return packages;
}

const BUNDLED_ASSETS = [
  {
    ecosystem: 'font',
    name: 'Geist Sans',
    version: 'Variable',
    license: 'SIL OFL 1.1',
    author: 'Vercel',
    homepage: 'https://vercel.com/font',
  },
  {
    ecosystem: 'font',
    name: 'Geist Mono',
    version: 'Variable',
    license: 'SIL OFL 1.1',
    author: 'Vercel',
    homepage: 'https://vercel.com/font',
  },
  {
    ecosystem: 'model',
    name: 'Qwen2.5-14B-Instruct',
    version: 'Q5_K_M GGUF',
    license: 'Apache 2.0',
    author: 'Qwen / Alibaba Cloud',
    homepage: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct',
  },
  {
    ecosystem: 'icons',
    name: 'Lucide',
    version: '',
    license: 'ISC',
    author: 'Lucide contributors',
    homepage: 'https://lucide.dev',
  },
];

function dedupe(items) {
  const seen = new Map();
  for (const item of items) {
    const key = `${item.ecosystem}:${item.name}`;
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values()).sort((a, b) => {
    if (a.ecosystem !== b.ecosystem) return a.ecosystem.localeCompare(b.ecosystem);
    return a.name.localeCompare(b.name);
  });
}

function main() {
  const assetsDir = path.join(root, 'src', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  const all = dedupe([
    ...BUNDLED_ASSETS,
    ...collectNpmLicenses(),
    ...collectCargoPackages(),
  ]);

  const out = {
    generated_at: new Date().toISOString(),
    total: all.length,
    packages: all,
  };
  const outFile = path.join(assetsDir, 'licenses.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`[licenses] wrote ${all.length} entries → ${outFile}`);
}

main();
