import fs from 'fs';
import path from 'path';

const SUPPORT_BUNDLE_NAMES = [
  'Promix-QuickSupport.zip',
  'Promix-QuickSupport.exe',
  'Automatix-QuickSupport.exe',
  'rustdesk.exe',
];

export function supportAssetsDir(): string {
  const custom = process.env.PROMIX_REMOTE_SUPPORT_DIR;
  if (custom) {
    try {
      if (fs.existsSync(custom)) return custom;
    } catch { /* ignore */ }
  }
  const candidates = [
    path.join(process.cwd(), 'public', 'support'),
    path.join(__dirname, '../../public/support'),
    path.join(__dirname, '../../../public/support'),
  ];
  return candidates.find((p) => {
    try { return fs.existsSync(p); } catch { return false; }
  }) || candidates[0];
}

export function findSupportBundle(): { file: string; full: string } | null {
  const custom = process.env.PROMIX_REMOTE_SUPPORT_BUNDLE;
  if (custom) {
    try {
      if (fs.existsSync(custom)) return { file: path.basename(custom), full: path.resolve(custom) };
    } catch { /* ignore */ }
  }
  const dir = supportAssetsDir();
  for (const name of SUPPORT_BUNDLE_NAMES) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return { file: name, full };
  }
  return null;
}

export function bundleAvailable(): boolean {
  return findSupportBundle() !== null;
}
