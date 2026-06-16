import crypto from 'crypto';
import fs from 'fs';
import path from 'path';



let app: any = undefined;
try {
  const _e = require('electron');
  if (_e && typeof _e === 'object') { app = _e.app; }
} catch {  }






function userDataDir(): string {
  const userData = app?.getPath?.('userData');
  return userData ? userData : path.join(process.cwd(), 'data');
}
















const TOKEN_FILE = () => path.join(userDataDir(), 'ai-token.txt');

function findAiConfigPath(): string | null {
  
  const candidates = [
    
    (process as any).resourcesPath && path.join((process as any).resourcesPath, 'ai-service', 'config.toml'),
    
    path.join(process.cwd(), 'ai-service', 'config.toml'),
    
    path.join(userDataDir(), 'ai-service', 'config.toml'),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}






function readTokenFromConfig(tomlText: string): string | null {
  const match = tomlText.match(/^\s*api_token\s*=\s*"([^"]*)"/m);
  return match ? match[1] : null;
}





function writeTokenToConfig(tomlText: string, token: string): string {
  const hasAuthSection = /^\s*\[auth\]/m.test(tomlText);
  const hasToken = /^\s*api_token\s*=/m.test(tomlText);

  if (hasToken) {
    return tomlText.replace(
      /^(\s*api_token\s*=\s*)"[^"]*"/m,
      `$1"${token}"`,
    );
  }

  if (hasAuthSection) {
    return tomlText.replace(
      /^(\s*\[auth\][^\n]*\n)/m,
      `$1api_token = "${token}"\n`,
    );
  }

  const suffix = tomlText.endsWith('\n') ? '' : '\n';
  return `${tomlText}${suffix}\n[auth]\napi_token = "${token}"\n`;
}





export function ensureAiServiceToken(): { token: string; generated: boolean; source: string } {
  const cfgPath = findAiConfigPath();

  
  
  if (!cfgPath) {
    const file = TOKEN_FILE();
    if (fs.existsSync(file)) {
      return { token: fs.readFileSync(file, 'utf-8').trim(), generated: false, source: 'userData' };
    }
    const fresh = generateToken();
    fs.writeFileSync(file, fresh);
    return { token: fresh, generated: true, source: 'userData (ai-service not installed)' };
  }

  const toml = fs.readFileSync(cfgPath, 'utf-8');
  const existing = readTokenFromConfig(toml);

  if (existing && existing.length >= 32) {
    
    try { fs.writeFileSync(TOKEN_FILE(), existing); } catch {  }
    return { token: existing, generated: false, source: cfgPath };
  }

  const fresh = generateToken();
  const updated = writeTokenToConfig(toml, fresh);
  fs.writeFileSync(cfgPath, updated);
  try { fs.writeFileSync(TOKEN_FILE(), fresh); } catch {  }
  return { token: fresh, generated: true, source: cfgPath };
}





export function rotateAiServiceToken(): { token: string; restartRequired: boolean } {
  const cfgPath = findAiConfigPath();
  const fresh = generateToken();

  if (cfgPath) {
    const toml = fs.readFileSync(cfgPath, 'utf-8');
    fs.writeFileSync(cfgPath, writeTokenToConfig(toml, fresh));
  }
  try { fs.writeFileSync(TOKEN_FILE(), fresh); } catch {  }

  return { token: fresh, restartRequired: true };
}
