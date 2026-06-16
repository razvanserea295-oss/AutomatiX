import type { Database } from 'sql.js';
import { CommandError } from '../middleware/errors';
import { capStr } from '../middleware/validate';
import type { UserWithRole } from './authService';





export interface ChatConversation {
  id: number;
  other_user_id: number;
  other_user_name: string;
  other_user_role: string;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: number | null;
  unread_count: number;
  is_group: boolean;
  group_name: string | null;
  group_members: string | null;
  group_avatar: string | null;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  message_type: string;
  attachment_name: string | null;
  attachment_data: string | null;
  reference_type: string | null;
  reference_id: number | null;
  reference_label: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  is_mine: boolean;
  reply_to_id: number | null;
}

export interface SendMessageRequest {
  to_user_id?: number | null;
  conversation_id?: number | null;
  content: string;
  message_type?: string | null;
  attachment_name?: string | null;
  attachment_data?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_label?: string | null;
  reply_to_id?: number | null;
}

export interface CreateGroupRequest {
  name: string;
  member_ids: number[];
}

export interface GroupMember {
  user_id: number;
  full_name: string;
  role_name: string;
  is_admin: boolean;
  is_creator: boolean;
}

export interface GroupDetails {
  id: number;
  group_name: string;
  group_avatar: string | null;
  created_by: number;
  created_by_name: string;
  created_at: string;
  members: GroupMember[];
}

export interface UpdateGroupRequest {
  conversation_id: number;
  name?: string | null;
  avatar?: string | null; 
}

export interface ManageGroupMemberRequest {
  conversation_id: number;
  member_id: number;
}

export interface AddGroupMembersRequest {
  conversation_id: number;
  member_ids: number[];
}

export interface SetGroupAdminRequest {
  conversation_id: number;
  member_id: number;
  is_admin: boolean;
}





function parseIdArray(json: string | null | undefined): number[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  } catch {
    return [];
  }
}





export class ChatService {
  private static getOrCreateConversation(db: Database, userA: number, userB: number): number {
    const a = Math.min(userA, userB);
    const b = Math.max(userA, userB);

    const stmt = db.prepare(
      'SELECT id FROM chat_conversations WHERE user_a = ? AND user_b = ? AND is_group = 0'
    );
    stmt.bind([a, b]);
    if (stmt.step()) {
      const id = stmt.get()[0] as number;
      stmt.free();
      return id;
    }
    stmt.free();

    db.run(
      'INSERT INTO chat_conversations (user_a, user_b, is_group) VALUES (?, ?, 0)',
      [a, b]
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const id = idStmt.get()[0] as number;
    idStmt.free();
    return id;
  }

  static createGroup(db: Database, user: UserWithRole, req: CreateGroupRequest): ChatConversation {
    if (!req.name?.trim()) {
      throw CommandError.badRequest('Numele grupului este obligatoriu');
    }
    if (!req.member_ids || req.member_ids.length === 0) {
      throw CommandError.badRequest('Grupul trebuie sa aiba cel putin un membru');
    }

    const members = [...new Set([...req.member_ids, user.id])].sort((a, b) => a - b);
    const membersJson = JSON.stringify(members);
    const adminsJson = JSON.stringify([user.id]);

    db.run(
      `INSERT INTO chat_conversations
         (user_a, user_b, is_group, group_name, group_members, created_by, group_admins)
       VALUES (?, ?, 1, ?, ?, ?, ?)`,
      [user.id, user.id, req.name.trim(), membersJson, user.id, adminsJson]
    );
    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const convId = idStmt.get()[0] as number;
    idStmt.free();

    return {
      id: convId,
      other_user_id: 0,
      other_user_name: '',
      other_user_role: '',
      last_message: null,
      last_message_at: null,
      last_sender_id: null,
      unread_count: 0,
      is_group: true,
      group_name: req.name.trim(),
      group_members: membersJson,
      group_avatar: null,
    };
  }

  
  
  

  
  static getGroupDetails(db: Database, user: UserWithRole, conversationId: number): GroupDetails {
    if (conversationId == null) throw CommandError.badRequest('conversation_id obligatoriu');
    const stmt = db.prepare(
      `SELECT c.id, c.group_name, c.group_avatar, c.group_members, c.group_admins,
              c.created_by, c.created_at, u.full_name
       FROM chat_conversations c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = ? AND c.is_group = 1`
    );
    stmt.bind([conversationId]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Grupul nu există');
    }
    const row = stmt.get();
    stmt.free();

    const memberIds = parseIdArray(row[3] as string | null);
    const adminIds = parseIdArray(row[4] as string | null);
    const createdBy = (row[5] as number | null) ?? memberIds[0] ?? user.id;

    if (!memberIds.includes(user.id)) {
      throw CommandError.forbidden('Nu ești membru al acestui grup');
    }

    
    const members: GroupMember[] = [];
    if (memberIds.length > 0) {
      const placeholders = memberIds.map(() => '?').join(',');
      const memberStmt = db.prepare(
        `SELECT u.id, u.full_name, COALESCE(r.name, '')
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id IN (${placeholders})`
      );
      memberStmt.bind(memberIds);
      const byId = new Map<number, { full_name: string; role_name: string }>();
      while (memberStmt.step()) {
        const r = memberStmt.get();
        byId.set(r[0] as number, { full_name: (r[1] as string) || '', role_name: (r[2] as string) || '' });
      }
      memberStmt.free();
      for (const id of memberIds) {
        const info = byId.get(id) ?? { full_name: '(utilizator șters)', role_name: '' };
        members.push({
          user_id: id,
          full_name: info.full_name,
          role_name: info.role_name,
          is_admin: adminIds.includes(id) || id === createdBy,
          is_creator: id === createdBy,
        });
      }
    }

    return {
      id: row[0] as number,
      group_name: (row[1] as string) || 'Grup',
      group_avatar: row[2] as string | null,
      created_by: createdBy,
      created_by_name: (row[7] as string) || '',
      created_at: (row[6] as string) || '',
      members,
    };
  }

  
  static updateGroup(db: Database, user: UserWithRole, req: UpdateGroupRequest): GroupDetails {
    this.assertGroupAdmin(db, user, req.conversation_id);

    const fields: string[] = [];
    const params: any[] = [];
    if (typeof req.name === 'string') {
      const name = req.name.trim();
      if (!name) throw CommandError.badRequest('Numele grupului nu poate fi gol');
      fields.push('group_name = ?');
      params.push(name);
    }
    if (typeof req.avatar === 'string') {
      
      
      
      fields.push('group_avatar = ?');
      params.push(req.avatar.length > 0 ? req.avatar : null);
    }
    if (fields.length === 0) {
      throw CommandError.badRequest('Nimic de actualizat');
    }
    params.push(req.conversation_id);
    db.run(`UPDATE chat_conversations SET ${fields.join(', ')} WHERE id = ? AND is_group = 1`, params);
    return this.getGroupDetails(db, user, req.conversation_id);
  }

  
  static addGroupMembers(db: Database, user: UserWithRole, req: AddGroupMembersRequest): GroupDetails {
    this.assertGroupAdmin(db, user, req.conversation_id);
    if (!req.member_ids?.length) throw CommandError.badRequest('Nu ai selectat utilizatori');

    const current = this.loadGroupArrays(db, req.conversation_id);
    const merged = [...new Set([...current.members, ...req.member_ids])].sort((a, b) => a - b);
    db.run(
      'UPDATE chat_conversations SET group_members = ? WHERE id = ? AND is_group = 1',
      [JSON.stringify(merged), req.conversation_id]
    );
    return this.getGroupDetails(db, user, req.conversation_id);
  }

  
  static removeGroupMember(db: Database, user: UserWithRole, req: ManageGroupMemberRequest): GroupDetails {
    this.assertGroupCreator(db, user, req.conversation_id);

    const current = this.loadGroupArrays(db, req.conversation_id);
    if (req.member_id === current.created_by) {
      throw CommandError.badRequest('Nu poți elimina creatorul grupului');
    }
    const newMembers = current.members.filter(id => id !== req.member_id);
    const newAdmins = current.admins.filter(id => id !== req.member_id);
    db.run(
      'UPDATE chat_conversations SET group_members = ?, group_admins = ? WHERE id = ? AND is_group = 1',
      [JSON.stringify(newMembers), JSON.stringify(newAdmins), req.conversation_id]
    );
    return this.getGroupDetails(db, user, req.conversation_id);
  }

  
  static setGroupAdmin(db: Database, user: UserWithRole, req: SetGroupAdminRequest): GroupDetails {
    this.assertGroupCreator(db, user, req.conversation_id);

    const current = this.loadGroupArrays(db, req.conversation_id);
    if (req.member_id === current.created_by) {
      throw CommandError.badRequest('Creatorul grupului este întotdeauna admin');
    }
    if (!current.members.includes(req.member_id)) {
      throw CommandError.badRequest('Utilizatorul nu este în grup');
    }
    const has = current.admins.includes(req.member_id);
    let newAdmins = current.admins;
    if (req.is_admin && !has) newAdmins = [...current.admins, req.member_id];
    if (!req.is_admin && has)  newAdmins = current.admins.filter(id => id !== req.member_id);
    db.run(
      'UPDATE chat_conversations SET group_admins = ? WHERE id = ? AND is_group = 1',
      [JSON.stringify(newAdmins), req.conversation_id]
    );
    return this.getGroupDetails(db, user, req.conversation_id);
  }

  

  private static loadGroupArrays(db: Database, conversationId: number): {
    members: number[]; admins: number[]; created_by: number;
  } {
    const stmt = db.prepare(
      'SELECT group_members, group_admins, created_by FROM chat_conversations WHERE id = ? AND is_group = 1'
    );
    stmt.bind([conversationId]);
    if (!stmt.step()) {
      stmt.free();
      throw CommandError.notFound('Grupul nu există');
    }
    const row = stmt.get();
    stmt.free();
    return {
      members: parseIdArray(row[0] as string | null),
      admins: parseIdArray(row[1] as string | null),
      created_by: (row[2] as number | null) ?? 0,
    };
  }

  private static assertGroupAdmin(db: Database, user: UserWithRole, conversationId: number): void {
    const g = this.loadGroupArrays(db, conversationId);
    if (user.id !== g.created_by && !g.admins.includes(user.id)) {
      throw CommandError.forbidden('Doar creatorul sau adminii pot face această acțiune');
    }
  }

  private static assertGroupCreator(db: Database, user: UserWithRole, conversationId: number): void {
    const g = this.loadGroupArrays(db, conversationId);
    if (user.id !== g.created_by) {
      throw CommandError.forbidden('Doar creatorul grupului poate face această acțiune');
    }
  }

  static getConversations(db: Database, user: UserWithRole): ChatConversation[] {
    const stmt = db.prepare(
      `SELECT c.id,
              CASE WHEN c.is_group = 0 THEN (CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END) ELSE 0 END as other_id,
              CASE WHEN c.is_group = 0 THEN u.full_name ELSE COALESCE(c.group_name, 'Grup') END,
              CASE WHEN c.is_group = 0 THEN COALESCE(r.name, '') ELSE '' END,
              (SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
              c.last_message_at,
              (SELECT sender_id FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
              (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND sender_id != ? AND read_at IS NULL),
              c.is_group, c.group_name, c.group_members, c.group_avatar
       FROM chat_conversations c
       LEFT JOIN users u ON u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE (c.is_group = 0 AND (c.user_a = ? OR c.user_b = ?))
          OR (c.is_group = 1 AND c.group_members LIKE '%' || ? || '%')
       ORDER BY c.last_message_at DESC NULLS LAST`
    );
    stmt.bind([user.id, user.id, user.id, user.id, user.id, user.id]);

    const results: ChatConversation[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      results.push({
        id: row[0] as number,
        other_user_id: row[1] as number,
        other_user_name: (row[2] as string) || '',
        other_user_role: (row[3] as string) || '',
        last_message: row[4] as string | null,
        last_message_at: row[5] as string | null,
        last_sender_id: row[6] as number | null,
        unread_count: (row[7] as number) || 0,
        is_group: !!(row[8] as number),
        group_name: row[9] as string | null,
        group_members: row[10] as string | null,
        group_avatar: row[11] as string | null,
      });
    }
    stmt.free();
    return results;
  }

  static getMessages(db: Database, user: UserWithRole, conversationId: number): ChatMessage[] {
    if (conversationId == null) throw CommandError.badRequest('conversation_id obligatoriu');
    
    const checkStmt = db.prepare(
      `SELECT EXISTS(
          SELECT 1 FROM chat_conversations WHERE id = ? AND (
              (is_group = 0 AND (user_a = ? OR user_b = ?))
              OR (is_group = 1 AND group_members LIKE '%' || ? || '%')
          )
      )`
    );
    checkStmt.bind([conversationId, user.id, user.id, user.id]);
    checkStmt.step();
    const hasAccess = checkStmt.get()[0] as number;
    checkStmt.free();
    if (!hasAccess) {
      throw CommandError.forbidden('Nu ai acces la aceasta conversatie');
    }

    
    try {
      db.run(
        "UPDATE chat_messages SET delivered_at = datetime('now') WHERE conversation_id = ? AND sender_id != ? AND delivered_at IS NULL",
        [conversationId, user.id]
      );
    } catch {  }

    const stmt = db.prepare(
      `SELECT m.id, m.conversation_id, m.sender_id, u.full_name, m.content, m.message_type,
              m.attachment_name, m.attachment_data, m.reference_type, m.reference_id, m.reference_label,
              m.delivered_at, m.read_at, m.created_at, m.reply_to_id
       FROM chat_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ? ORDER BY m.created_at ASC`
    );
    stmt.bind([conversationId]);

    const results: ChatMessage[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      const senderId = row[2] as number;
      results.push({
        id: row[0] as number,
        conversation_id: row[1] as number,
        sender_id: senderId,
        sender_name: (row[3] as string) || '',
        content: (row[4] as string) || '',
        message_type: (row[5] as string) || 'text',
        attachment_name: row[6] as string | null,
        attachment_data: row[7] as string | null,
        reference_type: row[8] as string | null,
        reference_id: row[9] as number | null,
        reference_label: row[10] as string | null,
        delivered_at: row[11] as string | null,
        read_at: row[12] as string | null,
        created_at: row[13] as string,
        is_mine: senderId === user.id,
        reply_to_id: row[14] as number | null,
      });
    }
    stmt.free();
    return results;
  }

  static sendMessage(db: Database, user: UserWithRole, req: SendMessageRequest): ChatMessage {
    let convId: number;
    if (req.conversation_id != null) {
      convId = req.conversation_id;
    } else if (req.to_user_id != null) {
      convId = this.getOrCreateConversation(db, user.id, req.to_user_id);
    } else {
      throw CommandError.badRequest('to_user_id sau conversation_id este necesar');
    }

    const msgType = req.message_type || 'text';

    
    
    
    
    
    
    
    if (req.attachment_name) {
      
      
      
      const ext = req.attachment_name.split('.').pop()?.toLowerCase() || '';
      if (['svg', 'html', 'htm', 'xhtml', 'mhtml', 'js', 'mjs'].includes(ext)) {
        throw CommandError.badRequest(`Tip fișier '${ext}' nepermis în chat (risc XSS).`);
      }
    }

    
    
    
    
    const validated = {
      content: capStr(req.content, 8_000, 'content', { trim: false }),
      attachment_name: capStr(req.attachment_name, 255, 'attachment_name'),
      attachment_data: capStr(req.attachment_data, 10 * 1024 * 1024 * 1024, 'attachment_data', { trim: false }),
      reference_type: capStr(req.reference_type, 64, 'reference_type'),
      reference_label: capStr(req.reference_label, 200, 'reference_label'),
    };
    if (!validated.content && !validated.attachment_data) {
      throw CommandError.badRequest('Mesaj gol — adaugă text sau atașament');
    }

    db.run(
      `INSERT INTO chat_messages (conversation_id, sender_id, content, message_type, attachment_name, attachment_data, reference_type, reference_id, reference_label, reply_to_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [convId, user.id, validated.content, msgType, validated.attachment_name, validated.attachment_data,
       validated.reference_type, req.reference_id ?? null, validated.reference_label, req.reply_to_id ?? null]
    );

    const idStmt = db.prepare('SELECT last_insert_rowid()');
    idStmt.step();
    const msgId = idStmt.get()[0] as number;
    idStmt.free();

    db.run(
      "UPDATE chat_conversations SET last_message_at = datetime('now') WHERE id = ?",
      [convId]
    );

    const fetchStmt = db.prepare(
      `SELECT m.id, m.conversation_id, m.sender_id, u.full_name, m.content, m.message_type,
              m.attachment_name, m.attachment_data, m.reference_type, m.reference_id, m.reference_label,
              m.delivered_at, m.read_at, m.created_at, m.reply_to_id
       FROM chat_messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
    );
    fetchStmt.bind([msgId]);
    if (!fetchStmt.step()) {
      fetchStmt.free();
      throw CommandError.internal('Eroare la citirea mesajului creat');
    }
    const row = fetchStmt.get();
    fetchStmt.free();

    return {
      id: row[0] as number,
      conversation_id: row[1] as number,
      sender_id: row[2] as number,
      sender_name: (row[3] as string) || '',
      content: (row[4] as string) || '',
      message_type: (row[5] as string) || 'text',
      attachment_name: row[6] as string | null,
      attachment_data: row[7] as string | null,
      reference_type: row[8] as string | null,
      reference_id: row[9] as number | null,
      reference_label: row[10] as string | null,
      delivered_at: row[11] as string | null,
      read_at: row[12] as string | null,
      created_at: row[13] as string,
      is_mine: true,
      reply_to_id: row[14] as number | null,
    };
  }

  static markRead(db: Database, user: UserWithRole, conversationId: number): void {
    db.run(
      "UPDATE chat_messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL",
      [conversationId, user.id]
    );
  }

  static getUnreadCount(db: Database, user: UserWithRole): number {
    const stmt = db.prepare(
      `SELECT COUNT(*) FROM chat_messages m JOIN chat_conversations c ON c.id = m.conversation_id
       WHERE ((c.is_group = 0 AND (c.user_a = ? OR c.user_b = ?))
           OR (c.is_group = 1 AND c.group_members LIKE '%' || ? || '%'))
         AND m.sender_id != ? AND m.read_at IS NULL`
    );
    stmt.bind([user.id, user.id, user.id, user.id]);
    let count = 0;
    if (stmt.step()) {
      count = (stmt.get()[0] as number) || 0;
    }
    stmt.free();
    return count;
  }
}
