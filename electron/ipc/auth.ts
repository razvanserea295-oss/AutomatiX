import { ipcRegister } from '../commands/registry';
import { AuthService } from '../services/authService';
import { withAdminUser } from '../middleware/auth';
import { requireTokenShape } from '../middleware/auth';
import { getDb } from '../db/connection';
import { saveDatabase } from '../db/connection';
import { CommandError } from '../middleware/errors';

export function registerAuthHandlers(): void {
  ipcRegister('login', async (args: any) => {
    const { request } = args || {};
    const username = request?.username || args?.username;
    const password = request?.password || args?.password;
    if (!username || !password) {
      throw CommandError.badRequest('Username și parola sunt obligatorii');
    }
    
    
    
    
    const clientIp = (args?.clientIp as string | null) || '127.0.0.1';
    const db = getDb();
    const result = await AuthService.login(db, username, password, clientIp);
    saveDatabase();
    return result;
  });

  ipcRegister('logout', async (args: any) => {
    const token = args?.token;
    if (!token) return;
    requireTokenShape(token);
    const db = getDb();
    AuthService.logout(db, token);
    saveDatabase();
  });

  ipcRegister('validate_session', async (args: any) => {
    const token = args?.token;
    if (!token) throw CommandError.unauthorized('Token lipsă');
    requireTokenShape(token);
    const db = getDb();
    return AuthService.validateSession(db, token);
  });

  ipcRegister('cleanup_sessions', async (args: any) => {
    
    
    return withAdminUser(args?.token, (db) => AuthService.cleanupExpiredSessions(db));
  });

  ipcRegister('change_password', async (args: any) => {
    const token = args?.token;
    const currentPassword = args?.current_password;
    const newPassword = args?.new_password;
    if (!token) throw CommandError.unauthorized('Token lipsă');
    if (!currentPassword || !newPassword) {
      throw CommandError.badRequest('Parola curentă și cea nouă sunt obligatorii');
    }
    requireTokenShape(token);
    const db = getDb();
    const user = await AuthService.changePassword(db, token, currentPassword, newPassword);
    saveDatabase();
    return user;
  });

  
  ipcRegister('enable_2fa_start', async (args: any) => {
    const token = args?.token;
    if (!token) throw CommandError.unauthorized('Token lipsă');
    requireTokenShape(token);
    const result = AuthService.enable2FAStart(getDb(), token);
    saveDatabase();
    return result;
  });

  ipcRegister('enable_2fa_confirm', async (args: any) => {
    const token = args?.token;
    const code  = args?.code;
    if (!token) throw CommandError.unauthorized('Token lipsă');
    if (!code)  throw CommandError.badRequest('Cod 2FA obligatoriu');
    requireTokenShape(token);
    const result = AuthService.enable2FAConfirm(getDb(), token, String(code));
    saveDatabase();
    return result;
  });

  ipcRegister('disable_2fa', async (args: any) => {
    const token = args?.token;
    const code  = args?.code;
    if (!token) throw CommandError.unauthorized('Token lipsă');
    if (!code)  throw CommandError.badRequest('Cod 2FA obligatoriu');
    requireTokenShape(token);
    const result = AuthService.disable2FA(getDb(), token, String(code));
    saveDatabase();
    return result;
  });

  ipcRegister('login_verify_2fa', async (args: any) => {
    const challenge = args?.request?.challenge || args?.challenge;
    const code      = args?.request?.code      || args?.code;
    if (!challenge || !code) {
      throw CommandError.badRequest('Challenge și cod obligatorii');
    }
    const clientIp = (args?.clientIp as string | null) || '127.0.0.1';
    const result = await AuthService.loginVerify2FA(getDb(), String(challenge), String(code), clientIp);
    saveDatabase();
    return result;
  });
}
