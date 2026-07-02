




















import path from 'path';
import { getDb, saveDatabase } from './db';
import { logger } from './eventLog';
import { CommandError } from '../electron/middleware/errors';
import { logAuditEvent } from '../electron/db/auditLogs';
import { AuthService } from '../electron/services/authService';
import { installExternalDb } from '../electron/db/connection';
import { getCommand, commandCount, wrapCommand, ipcRegister } from '../electron/commands/registry';
import { scheduleServerRespawn } from './serverRespawn';
import { runRollingBackupServer, listBackupsServer, getBackupDirectory, BACKUP_CONFIG } from './backup';
import {
  createZipBackup, listAutoBackups, getConfig as getAutoBackupConfig,
  setConfig as setAutoBackupConfig, restoreInPlace, readAutoBackup,
  getAutoBackupDirectory, startAutoBackupScheduler, importUploadedBackup,
  type BackupConfigPatch,
} from './autoBackup';
import { listAuditUnified, countAuditUnified, exportAuditUnifiedCsv, type AuditListFilters } from '../electron/db/audit';
import { validateCommandArgs } from './inputValidation';
import { emit as sseEmit } from './eventHub';










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

  // Belt-and-suspenders: if remote-support registrar failed or was missing from an
  // older handler bundle, register its commands here so the page works after deploy.
  try {
    if (!getCommand('get_remote_endpoints')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { registerRemoteSupportHandlers } = require('../electron/ipc/remoteSupport');
      registerRemoteSupportHandlers();
      console.log('[server] remote support IPC handlers registered (fallback)');
    }
  } catch (err) {
    console.warn('[server] remote support handlers unavailable:', err);
  }

  
  
  
  
  
  
  if (!getCommand('log_renderer')) {
    ipcRegister('log_renderer', async (args: { level?: string; message?: string; meta?: unknown }) => {
      const level = (args?.level as 'info' | 'warn' | 'error' | 'debug') || 'info';
      const msg = args?.message ?? '';
      const meta = args?.meta;
      // Route client (renderer) errors into the same structured/rotating log as
      // the server, so all errors land in one place (data/logs/server-events.log).
      const line = `[renderer:${level}] ${msg}`;
      if (level === 'error') logger.error(line, meta);
      else if (level === 'warn') logger.warn(line, meta);
      else if (level === 'debug') logger.debug(line, meta);
      else logger.info(line, meta);
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

  // Migration: upload a backup zip (from an old standalone/Electron desktop) and
  // restore it into THIS tenant. Admin only; restoreInPlace makes a safety
  // backup first. Used to move a firm's local data into its cloud tenant.
  ipcRegister('auto_backup_import', async (args: any) => {
    requireAdminFromArgs(args);
    const a = (args?.request ?? args ?? {});
    const base64 = String(a.base64 ?? a.data ?? '');
    if (!base64) throw CommandError.badRequest('Conținut backup lipsă (base64).');
    return importUploadedBackup(String(a.name ?? 'import.zip'), base64);
  });

  
  
  
  
  
  
  
  ipcRegister('restart_server', async (args: any) => {
    const actor = requireAdminFromArgs(args);

    const entry = process.argv[1];
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
      scheduleServerRespawn({
        by: actor.username,
        userId: actor.id,
        reason: 'restart_server command',
      });
    } catch (e) {
      console.error('[restart] spawn failed — staying up:', e);
      throw CommandError.internal('Nu am putut porni procesul nou — restart anulat, serverul rămâne pornit.');
    }

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
