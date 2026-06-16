



















import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getDb, saveDatabase, flushDatabase } from './db';
import { CommandError } from '../electron/middleware/errors';
import { logAuditEvent } from '../electron/db/auditLogs';
import { AuthService } from '../electron/services/authService';
import { installExternalDb } from '../electron/db/connection';
import { getCommand, commandCount, wrapCommand, ipcRegister } from '../electron/commands/registry';
import { emit as sseEmit } from './eventHub';
import { runRollingBackupServer, listBackupsServer, getBackupDirectory, BACKUP_CONFIG } from './backup';
import {
  createZipBackup, listAutoBackups, getConfig as getAutoBackupConfig,
  setConfig as setAutoBackupConfig, restoreInPlace, readAutoBackup,
  getAutoBackupDirectory, startAutoBackupScheduler, type BackupConfigPatch,
} from './autoBackup';
import { listAuditUnified, countAuditUnified, exportAuditUnifiedCsv, type AuditListFilters } from '../electron/db/audit';
import { validateCommandArgs } from './inputValidation';










const DEMO_READONLY = process.env.PROMIX_DEMO === '1' && process.env.PROMIX_DEMO_READONLY !== '0';
const WRITE_PREFIXES = [
  'create_', 'update_', 'delete_', 'add_', 'remove_', 'save_', 'set_', 'upload_',
  'import_', 'restart_', 'reset_', 'restore_', 'wipe_', 'send_', 'assign_', 'reassign_',
  'unassign_', 'promote_', 'convert_', 'toggle_', 'archive_', 'unarchive_', 'rename_',
  'move_', 'reorder_', 'approve_', 'reject_', 'record_', 'register_', 'apply_',
  'finalize_', 'pay_', 'issue_', 'duplicate_', 'clone_', 'merge_', 'split_', 'cancel_',
  'close_', 'reopen_', 'accept_', 'acknowledge_', 'resolve_', 'escalate_', 'complete_',
  'enable_', 'disable_', 'grant_', 'revoke_', 'seed_', 'change_', 'edit_', 'mark_', 'clear_',
];
const WRITE_EXACT = new Set(['restart_server']);

const READ_ALLOW = new Set(['log_renderer']);
export function isMutatingCommand(name: string): boolean {
  if (READ_ALLOW.has(name)) return false;
  if (WRITE_EXACT.has(name)) return true;
  return WRITE_PREFIXES.some(p => name.startsWith(p));
}

export function handleCommand(name: string, args: any): any | Promise<any> {
  const handler = getCommand(name);
  if (!handler) {
    throw CommandError.notFound(`No handler registered for '${name}'`);
  }
  if (DEMO_READONLY && isMutatingCommand(name)) {
    throw CommandError.forbidden('Mod demo — doar vizualizare. Modificările sunt dezactivate în prezentare.');
  }
  
  
  validateCommandArgs(name, args);
  return handler(args);
}








function withSse(name: string, emits: (result: any, args: any) => void): void {
  wrapCommand(name, async (args, original) => {
    const result = await original(args);
    try { emits(result, args); } catch (e) { console.warn(`[server] sse emit for '${name}' failed:`, e); }
    return result;
  });
}












export function registerCommandHandlers(): void {
  
  
  
  installExternalDb(getDb(), () => saveDatabase());

  
  
  
  
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerAllHandlers } = require('../electron/ipc/handler');
    registerAllHandlers();
  } catch (err) {
    console.warn('[server] IPC aggregator failed; some commands may be unregistered:', err);
  }

  
  
  
  
  
  
  if (!getCommand('log_renderer')) {
    ipcRegister('log_renderer', async (args: { level?: string; message?: string; meta?: unknown }) => {
      const level = (args?.level as 'info' | 'warn' | 'error' | 'debug') || 'info';
      const msg = args?.message ?? '';
      const meta = args?.meta;
      const line = `[renderer:${level}] ${msg}`;
      if (level === 'error') console.error(line, meta ?? '');
      else if (level === 'warn') console.warn(line, meta ?? '');
      else console.log(line, meta ?? '');
      return { ok: true };
    });
  }

  
  
  
  
  wrapCommand('login', async (args) => {
    const r = args?.request || args;
    const username = r?.username || args?.username;
    const password = r?.password || args?.password;
    if (!username || !password) {
      throw CommandError.badRequest('Username și parola sunt obligatorii');
    }
    const result = await AuthService.login(getDb(), username, password, args?.client_ip);
    saveDatabase();
    return result;
  });

  wrapCommand('logout', async (args) => {
    const token = args?.token;
    if (!token) return;
    AuthService.logout(getDb(), token, args?.client_ip);
    saveDatabase();
  });

  wrapCommand('login_verify_2fa', async (args) => {
    const r = args?.request || args;
    const challenge = r?.challenge || args?.challenge;
    const code      = r?.code      || args?.code;
    if (!challenge || !code) {
      throw CommandError.badRequest('Challenge și cod obligatorii');
    }
    const result = await AuthService.loginVerify2FA(getDb(), String(challenge), String(code), args?.client_ip);
    saveDatabase();
    return result;
  });

  wrapCommand('change_password', async (args) => {
    const token = args?.token;
    if (!token) throw CommandError.unauthorized('Token lipsă');
    if (!args?.current_password || !args?.new_password) {
      throw CommandError.badRequest('Parola curentă și cea nouă sunt obligatorii');
    }
    const result = await AuthService.changePassword(
      getDb(),
      token,
      args.current_password,
      args.new_password,
      args?.client_ip,
    );
    saveDatabase();
    return result;
  });

  
  
  withSse('create_project', (r) => {
    sseEmit({ topic: 'project.created', payload: { id: r?.id, name: r?.name } });
  });
  withSse('update_project', (r) => {
    sseEmit({ topic: 'project.updated', payload: { id: r?.id, stage_id: r?.stage_id, status: r?.status } });
  });
  withSse('accept_handoff', (r) => {
    sseEmit({ topic: 'handoff.updated', payload: { id: r?.id, project_id: r?.project_id, status: r?.status } });
    sseEmit({ topic: 'project.updated', payload: { id: r?.project_id } });
  });
  withSse('reject_handoff', (r) => {
    sseEmit({ topic: 'handoff.updated', payload: { id: r?.id, project_id: r?.project_id, status: r?.status } });
    sseEmit({ topic: 'project.updated', payload: { id: r?.project_id } });
  });
  withSse('force_handoff', (r) => {
    sseEmit({ topic: 'handoff.updated', payload: { id: r?.id, project_id: r?.project_id, status: r?.status } });
    sseEmit({ topic: 'project.updated', payload: { id: r?.project_id } });
  });
  withSse('set_handoff_urgent', (r) => {
    sseEmit({ topic: 'handoff.updated', payload: { id: r?.id, project_id: r?.project_id, is_urgent: r?.is_urgent } });
  });
  withSse('update_project_piece', (r) => {
    sseEmit({ topic: 'piece.updated', payload: { id: r?.id, project_id: r?.project_id, stage_id: r?.stage_id } });
  });

  
  function requireAdminFromArgs(args: any) {
    const token = args?.token;
    if (!token) throw CommandError.unauthorized('Token lipsă');
    const user = AuthService.validateSession(getDb(), token);
    if (user.role_name !== 'admin') {
      throw CommandError.forbidden('Necesită drepturi de administrator');
    }
    return user;
  }

  ipcRegister('backup_status', async (args: any) => {
    requireAdminFromArgs(args);
    const list = listBackupsServer();
    const lastRolling = list.find(b => b.kind === 'rolling') || null;
    return {
      directory: getBackupDirectory(),
      intervalHours: BACKUP_CONFIG.intervalHours,
      cooldownHours: BACKUP_CONFIG.cooldownHours,
      keepCount: BACKUP_CONFIG.keepCount,
      totalCount: list.length,
      lastBackupAt: lastRolling?.mtime ?? null,
      lastBackupName: lastRolling?.name ?? null,
    };
  });

  ipcRegister('backup_list', async (args: any) => {
    requireAdminFromArgs(args);
    return listBackupsServer();
  });

  ipcRegister('backup_run_now', async (args: any) => {
    requireAdminFromArgs(args);
    
    
    
    
    
    saveDatabase();
    return runRollingBackupServer();
  });

  
  ipcRegister('auto_backup_config_get', async (args: any) => {
    requireAdminFromArgs(args);
    return { ...getAutoBackupConfig(), directory: getAutoBackupDirectory() };
  });

  ipcRegister('auto_backup_config_set', async (args: any) => {
    requireAdminFromArgs(args);
    const patch = (args?.request ?? args ?? {}) as BackupConfigPatch;
    return setAutoBackupConfig(patch);
  });

  ipcRegister('auto_backup_list', async (args: any) => {
    requireAdminFromArgs(args);
    return listAutoBackups();
  });

  ipcRegister('auto_backup_run_now', async (args: any) => {
    requireAdminFromArgs(args);
    return createZipBackup();
  });

  ipcRegister('auto_backup_download', async (args: any) => {
    requireAdminFromArgs(args);
    const name = (args?.request ?? args ?? {}).name;
    return readAutoBackup(String(name));
  });

  ipcRegister('auto_backup_restore', async (args: any) => {
    requireAdminFromArgs(args);
    const name = (args?.request ?? args ?? {}).name;
    return restoreInPlace(String(name));
  });

  
  
  
  
  
  
  
  ipcRegister('restart_server', async (args: any) => {
    const actor = requireAdminFromArgs(args);

    const node = process.execPath;     
    const entry = process.argv[1];     
    const cwd = process.cwd();
    const isWin = process.platform === 'win32';
    if (!entry) {
      throw CommandError.internal('Nu pot determina scriptul serverului (process.argv[1] lipsă).');
    }

    
    try {
      logAuditEvent(
        getDb(), actor.id, 'SERVER_RESTART', 'system', null,
        JSON.stringify({ by: actor.username, old_pid: process.pid, entry }),
        args?.client_ip || '127.0.0.1',
      );
      saveDatabase();
    } catch (e) { console.warn('[restart] audit log failed (continuing):', e); }

    
    try {
      fs.writeFileSync(path.join(cwd, '.restart-marker'), JSON.stringify({
        at: new Date().toISOString(),
        by: actor.username,
        user_id: actor.id,
        old_pid: process.pid,
        entry,
        reason: 'restart_server command',
      }, null, 2));
    } catch (e) { console.warn('[restart] marker write failed (continuing):', e); }

    
    
    
    
    try {
      const child = isWin
        
        
        
        
        
        ? spawn('cmd.exe', ['/c', `ping -n 3 127.0.0.1 >nul & "${node}" "${entry}"`],
            { cwd, detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true })
        : spawn('sh', ['-c', `sleep 2; exec "${node}" "${entry}"`],
            { cwd, detached: true, stdio: 'ignore' });
      child.unref();
      console.log(`[restart] respawn scheduled (child pid ${child.pid}); pid ${process.pid} will exit in ~1s`);
    } catch (e) {
      console.error('[restart] spawn failed — staying up:', e);
      throw CommandError.internal('Nu am putut porni procesul nou — restart anulat, serverul rămâne pornit.');
    }

    
    
    setTimeout(() => {
      try { flushDatabase(); } catch (e) { console.error('[restart] DB flush failed:', e); }
      console.log('[restart] exiting now for respawn.');
      process.exit(0);
    }, 1000);

    return {
      ok: true,
      message: 'Restart inițiat — serverul revine în câteva secunde.',
      eta_seconds: 3,
      old_pid: process.pid,
    };
  });

  
  
  
  function auditFiltersFromArgs(args: any): AuditListFilters {
    const a = (args?.request ?? args ?? {}) as Record<string, unknown>;
    const f: AuditListFilters = {};
    if (a.entity)   f.entity = String(a.entity);
    if (a.action)   f.action = a.action as AuditListFilters['action'];
    if (a.since)    f.since = String(a.since);
    if (a.until)    f.until = String(a.until);
    if (a.userId != null)   f.userId = Number(a.userId);
    if (a.entityId != null) f.entityId = Number(a.entityId);
    if (a.limit != null)    f.limit = Number(a.limit);
    if (a.offset != null)   f.offset = Number(a.offset);
    return f;
  }

  ipcRegister('audit_list', async (args: any) => {
    requireAdminFromArgs(args);
    return listAuditUnified(auditFiltersFromArgs(args));
  });

  ipcRegister('audit_count', async (args: any) => {
    requireAdminFromArgs(args);
    return countAuditUnified(auditFiltersFromArgs(args));
  });

  ipcRegister('audit_export_csv', async (args: any) => {
    requireAdminFromArgs(args);
    return exportAuditUnifiedCsv(auditFiltersFromArgs(args));
  });

  
  
  startAutoBackupScheduler();

  console.log(`[server] ${commandCount()} commands registered`);
}
