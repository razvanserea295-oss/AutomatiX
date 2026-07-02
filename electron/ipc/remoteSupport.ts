import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { RemoteSupportService } from '../services/remoteSupportService';
import { CommandError } from '../middleware/errors';

let ipcMain: { handle: (ch: string, fn: (...a: unknown[]) => unknown) => void } | undefined;
try {
  const _e = require('electron');
  if (_e?.ipcMain) ipcMain = _e.ipcMain;
} catch { /* server-only */ }

const activeViewer: { proc: ChildProcess | null } = { proc: null };

function defaultRustDeskPaths(): string[] {
  const custom = process.env.PROMIX_RUSTDESK_VIEWER_PATH;
  const paths: string[] = [];
  if (custom && fs.existsSync(custom)) paths.push(custom);
  if (process.platform === 'win32') {
    paths.push(
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'RustDesk', 'rustdesk.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'RustDesk', 'rustdesk.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'RustDesk', 'rustdesk.exe'),
    );
  } else if (process.platform === 'darwin') {
    paths.push('/Applications/RustDesk.app/Contents/MacOS/RustDesk');
  } else {
    paths.push('/usr/bin/rustdesk', '/usr/local/bin/rustdesk');
  }
  return paths;
}

function findRustDeskExe(): string | null {
  for (const p of defaultRustDeskPaths()) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch { /* ignore */ }
  }
  return null;
}

function launchRustDeskViewer(rustdeskId: string, password: string): { ok: boolean; message: string; pid?: number } {
  if (!ipcMain) {
    return { ok: false, message: 'Lansarea viewer-ului RustDesk este disponibilă doar în aplicația desktop.' };
  }
  const exe = findRustDeskExe();
  if (!exe) {
    return {
      ok: false,
      message: 'RustDesk nu este instalat pe acest calculator. Instalați RustDesk sau setați PROMIX_RUSTDESK_VIEWER_PATH.',
    };
  }
  const id = rustdeskId.replace(/\s+/g, '');
  if (!id) return { ok: false, message: 'ID RustDesk invalid' };

  try {
    if (activeViewer.proc && activeViewer.proc.exitCode === null) {
      try { activeViewer.proc.kill(); } catch { /* ignore */ }
    }
    const proc = spawn(exe, ['--connect', id, '--password', password], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    proc.unref();
    activeViewer.proc = proc;
    return { ok: true, message: 'Conexiune RustDesk pornită', pid: proc.pid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export function registerRemoteSupportHandlers(): void {
  ipcRegister('get_remote_endpoints', async (args: { token?: string }) =>
    withAuthenticatedUser(args?.token ?? '', (db, user) => RemoteSupportService.listEndpoints(db, user)),
  );

  ipcRegister('create_remote_endpoint', async (args: Record<string, unknown>) =>
    withAuthenticatedUser(args?.token as string, (db, user) =>
      RemoteSupportService.createEndpoint(db, user, {
        name: String(args.name || ''),
        rustdesk_id: String(args.rustdesk_id || ''),
        platform: args.platform ? String(args.platform) : undefined,
        notes: args.notes != null ? String(args.notes) : null,
        client_id: args.client_id != null ? Number(args.client_id) : null,
        station_id: args.station_id != null ? Number(args.station_id) : null,
        password_hint: args.password_hint != null ? String(args.password_hint) : null,
      }),
    ),
  );

  ipcRegister('update_remote_endpoint', async (args: Record<string, unknown>) =>
    withAuthenticatedUser(args?.token as string, (db, user) =>
      RemoteSupportService.updateEndpoint(db, user, Number(args.id), {
        name: args.name !== undefined ? String(args.name) : undefined,
        rustdesk_id: args.rustdesk_id !== undefined ? String(args.rustdesk_id) : undefined,
        platform: args.platform !== undefined ? String(args.platform) : undefined,
        notes: args.notes !== undefined ? (args.notes as string | null) : undefined,
        client_id: args.client_id !== undefined ? (args.client_id as number | null) : undefined,
        station_id: args.station_id !== undefined ? (args.station_id as number | null) : undefined,
        password_hint: args.password_hint !== undefined ? (args.password_hint as string | null) : undefined,
        enabled: args.enabled !== undefined ? !!args.enabled : undefined,
      }),
    ),
  );

  ipcRegister('delete_remote_endpoint', async (args: { token?: string; id?: number }) =>
    withAuthenticatedUser(args?.token ?? '', (db, user) => {
      RemoteSupportService.deleteEndpoint(db, user, Number(args.id));
      return { ok: true };
    }),
  );

  ipcRegister('list_remote_sessions', async (args: { token?: string; limit?: number }) =>
    withAuthenticatedUser(args?.token ?? '', (db, user) =>
      RemoteSupportService.listSessions(db, user, args.limit ?? 50),
    ),
  );

  ipcRegister('create_quick_remote_support', async (args: Record<string, unknown>) =>
    withAuthenticatedUser(args?.token as string, (db, user) =>
      RemoteSupportService.createQuickSupport(db, user, {
        customer_ref: args.customer_ref != null ? String(args.customer_ref) : null,
        client_id: args.client_id != null ? Number(args.client_id) : null,
        service_ticket_id: args.service_ticket_id != null ? Number(args.service_ticket_id) : null,
        notes: args.notes != null ? String(args.notes) : null,
        ttl_hours: args.ttl_hours != null ? Number(args.ttl_hours) : undefined,
      }),
    ),
  );

  ipcRegister('start_remote_connection', async (args: Record<string, unknown>) =>
    withAuthenticatedUser(args?.token as string, (db, user) =>
      RemoteSupportService.startConnection(db, user, {
        session_id: args.session_id != null ? Number(args.session_id) : null,
        endpoint_id: args.endpoint_id != null ? Number(args.endpoint_id) : null,
        rustdesk_id: String(args.rustdesk_id || ''),
        notes: args.notes != null ? String(args.notes) : null,
      }),
    ),
  );

  ipcRegister('end_remote_session', async (args: { token?: string; session_id?: number; notes?: string }) =>
    withAuthenticatedUser(args?.token ?? '', (db, user) =>
      RemoteSupportService.endSession(db, user, Number(args.session_id), args.notes ?? null),
    ),
  );

  ipcRegister('cancel_remote_session', async (args: { token?: string; session_id?: number }) =>
    withAuthenticatedUser(args?.token ?? '', (db, user) =>
      RemoteSupportService.cancelQuickSession(db, user, Number(args.session_id)),
    ),
  );

  ipcRegister('get_remote_viewer_config', async (args: { token?: string }) =>
    withAuthenticatedUser(args?.token ?? '', () => RemoteSupportService.getViewerConfig()),
  );

  ipcRegister('launch_rustdesk_viewer', async (args: { token?: string; rustdesk_id?: string; password?: string }) =>
    withAuthenticatedUser(args?.token ?? '', () => {
      const id = String(args.rustdesk_id || '');
      const pw = String(args.password || '');
      if (!id || !pw) throw CommandError.badRequest('ID și parola sunt obligatorii');
      return launchRustDeskViewer(id, pw);
    }),
  );
}
