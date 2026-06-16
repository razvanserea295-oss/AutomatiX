import type { Database } from 'sql.js';









export function logAuditEvent(
  db: Database,
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  details: string | null = null,
  ip: string = '127.0.0.1',
): void {
  db.run(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, action, entityType, entityId, details, ip],
  );
}
