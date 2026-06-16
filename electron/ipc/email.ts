import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { EmailService } from '../services/emailService';
import { saveDatabase } from '../db/connection';
import { type Authed, type Cmd, payload } from '../commands/cmdArgs';


type SaveAccountRequest = Parameters<typeof EmailService.saveAccount>[2];
type TestConnectionRequest = Parameters<typeof EmailService.testConnection>[0];
type ListMessagesRequest = Parameters<typeof EmailService.listMessages>[2];
type MarkReadRequest = Parameters<typeof EmailService.markRead>[2];
type SendMessageRequest = Parameters<typeof EmailService.sendMessage>[2];
type SaveDraftRequest = Parameters<typeof EmailService.saveDraft>[2];

export function registerEmailHandlers(): void {
  ipcRegister<Authed>('email_get_account', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => EmailService.getAccount(db, user));
  });

  ipcRegister<Cmd<SaveAccountRequest>>('email_save_account', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      const result = EmailService.saveAccount(db, user, payload(args));
      saveDatabase();
      return result;
    });
  });

  ipcRegister<Authed>('email_delete_account', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      EmailService.deleteAccount(db, user);
      saveDatabase();
    });
  });

  ipcRegister<Cmd<TestConnectionRequest>>('email_test_connection', async (args) => {
    
    
    
    
    return withAuthenticatedUser(args.token, async () => {
      const req = args.request || args;
      const checkHost = (host: unknown): void => {
        if (typeof host !== 'string' || !host) return;
        const h = host.toLowerCase().trim();
        
        const denied = [
          'localhost', '127.', '0.0.0.0', '::1',
          '169.254.',  
          '10.', '192.168.',
          '172.16.', '172.17.', '172.18.', '172.19.',
          '172.20.', '172.21.', '172.22.', '172.23.',
          '172.24.', '172.25.', '172.26.', '172.27.',
          '172.28.', '172.29.', '172.30.', '172.31.',
        ];
        for (const d of denied) {
          if (h === d || h.startsWith(d)) {
            throw new Error('Host intern/privat nu e permis pentru test conexiune');
          }
        }
      };
      checkHost(req?.imap_host);
      checkHost(req?.smtp_host);
      return EmailService.testConnection(req);
    });
  });

  ipcRegister<Authed>('email_sync_inbox', async (args) => {
    
    
    
    return withAuthenticatedUser(args.token, async (db, user) => {
      const result = await EmailService.syncInbox(db, user);
      saveDatabase();
      return result;
    });
  });

  ipcRegister<Cmd<ListMessagesRequest>>('email_list_messages', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => EmailService.listMessages(db, user, payload(args)));
  });

  ipcRegister<Authed & { message_id: number }>('email_get_message', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => EmailService.getMessage(db, user, args.message_id));
  });

  ipcRegister<Authed>('email_list_threads', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => EmailService.listThreads(db, user));
  });

  ipcRegister<Cmd<MarkReadRequest>>('email_mark_read', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      EmailService.markRead(db, user, payload(args));
      saveDatabase();
    });
  });

  ipcRegister<Authed & { message_id: number }>('email_toggle_star', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      EmailService.toggleStar(db, user, args.message_id);
      saveDatabase();
    });
  });

  ipcRegister<Authed & { message_id: number }>('email_trash', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      EmailService.trashMessage(db, user, args.message_id);
      saveDatabase();
    });
  });

  ipcRegister<Cmd<SendMessageRequest>>('email_send', async (args) => {
    return withAuthenticatedUser(args.token, async (db, user) => {
      const result = await EmailService.sendMessage(db, user, payload(args));
      
      
      
      saveDatabase();
      return result;
    });
  });

  ipcRegister<Authed & { attachment_id: number }>('email_download_attachment', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => EmailService.downloadAttachment(db, user, args.attachment_id));
  });

  ipcRegister<Authed>('email_list_folders', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => EmailService.listFolders(db, user));
  });

  ipcRegister<Cmd<SaveDraftRequest>>('email_save_draft', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      const result = EmailService.saveDraft(db, user, payload(args));
      saveDatabase();
      return result;
    });
  });

  ipcRegister<Authed>('email_get_drafts', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => EmailService.getDrafts(db, user));
  });

  ipcRegister<Authed & { draft_id: number }>('email_delete_draft', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => {
      EmailService.deleteDraft(db, user, args.draft_id);
      saveDatabase();
    });
  });

  ipcRegister<Authed>('email_get_unread_count', async (args) => {
    return withAuthenticatedUser(args.token, (db, user) => EmailService.getUnreadCount(db, user));
  });
}
