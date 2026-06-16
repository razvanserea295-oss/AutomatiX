import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser } from '../middleware/auth';
import { ChatService } from '../services/chatService';

export function registerChatHandlers(): void {
  ipcRegister('get_chat_unread_count', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.getUnreadCount(db, user);
    });
  });

  ipcRegister('get_chat_conversations', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.getConversations(db, user);
    });
  });

  ipcRegister('get_chat_messages', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.getMessages(db, user, args.conversation_id);
    });
  });

  ipcRegister('send_chat_message', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.sendMessage(db, user, args.request || args);
    });
  });

  ipcRegister('mark_chat_read', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.markRead(db, user, args.conversation_id);
    });
  });

  ipcRegister('create_chat_group', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.createGroup(db, user, args.request || args);
    });
  });

  ipcRegister('get_chat_group_details', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.getGroupDetails(db, user, args.conversation_id);
    });
  });

  ipcRegister('update_chat_group', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.updateGroup(db, user, args.request || args);
    });
  });

  ipcRegister('add_chat_group_members', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.addGroupMembers(db, user, args.request || args);
    });
  });

  ipcRegister('remove_chat_group_member', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.removeGroupMember(db, user, args.request || args);
    });
  });

  ipcRegister('set_chat_group_admin', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      return ChatService.setGroupAdmin(db, user, args.request || args);
    });
  });
}
