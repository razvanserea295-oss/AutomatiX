










import type { Database } from 'sql.js';
import { HandoffService } from './handoffService';
import { AiHandoffService } from './aiHandoffService';
import { ExchangeRateService } from './exchangeRateService';
import { NotifierService } from './notifierService';
import { DeplasariService } from './deplasariService';
import { PersonalTasksService } from './personalTasksService';

let escalationTimer: NodeJS.Timeout | null = null;
let dailyTimer: NodeJS.Timeout | null = null;

function notifyManagers(db: Database, title: string, message: string): void {
  
  const stmt = db.prepare(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE LOWER(r.name) IN ('admin', 'manager')`
  );
  const ids: number[] = [];
  while (stmt.step()) ids.push(stmt.get()[0] as number);
  stmt.free();
  for (const uid of ids) {
    try {
      db.run(
        `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
         VALUES (?, 'escalation', ?, ?, ?, datetime('now'))`,
        [uid, title, message, 'handoffs']
      );
    } catch {  }
  }
  
  
  void NotifierService.send(db, {
    to: { userIds: ids },
    subject: `[automatiX] ${title}`,
    text: message,
  });
}





export function runEscalationStep(db: Database, save: () => void): { escalated: number } {
  const overdue = HandoffService.escalateOverdue(db);
  if (overdue.length > 0) {
    for (const h of overdue) {
      notifyManagers(db,
        `Predare blocată: ${h.project_name}`,
        `Predarea către ${h.to_role} (${h.to_stage_name}) e pendinte de >24h.`
      );
    }
    save();
  }
  return { escalated: overdue.length };
}




export async function runDailyStep(db: Database, save: () => void): Promise<{ anomalies: number; briefings: number; deplasari_alerts: number }> {
  
  
  
  const anomalies = AiHandoffService.detectAnomalies(db,
    { id: 0, username: 'system', full_name: 'System', role_id: 0, role_name: 'admin' } as any
  );

  
  
  
  
  
  const overdue = DeplasariService.findOverdueCostCompletion(db);
  let deplasariAlerts = 0;
  for (const trip of overdue) {
    const title = `Costuri necompletate: ${trip.person_name} → ${trip.destination}`;
    const message = `Deplasarea s-a încheiat acum ${trip.days_overdue + 7} zile (return ${trip.return_date}) ` +
      `dar costurile de transport / cazare nu sunt completate. ` +
      `SLA depășit cu ${trip.days_overdue} zile.`;
    const dedupeKey = `deplasare_costs_overdue_${trip.id}`;
    try {
      
      const userStmt = db.prepare(
        `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
         WHERE LOWER(r.name) IN ('admin', 'manager') AND u.active = 1`,
      );
      const userIds: number[] = [];
      while (userStmt.step()) userIds.push(userStmt.get()[0] as number);
      userStmt.free();

      for (const uid of userIds) {
        
        const existsStmt = db.prepare(
          `SELECT 1 FROM user_notifications
           WHERE user_id = ? AND kind = ? LIMIT 1`,
        );
        existsStmt.bind([uid, dedupeKey]);
        const has = existsStmt.step();
        existsStmt.free();
        if (has) continue;

        db.run(
          `INSERT INTO user_notifications (user_id, kind, title, message, link_page, created_at)
           VALUES (?, ?, ?, ?, 'deplasari', datetime('now'))`,
          [uid, dedupeKey, title, message],
        );
        deplasariAlerts++;
      }
    } catch (err) {
      console.error('[deplasari-overdue] alert insert failed:', err);
    }
  }

  
  const briefings = 0;

  save();
  return { anomalies: anomalies.generated, briefings, deplasari_alerts: deplasariAlerts };
}






export function runMaintenanceStep(db: Database, save: () => void): { created: number } {
  let created = 0;
  try {
    const stmt = db.prepare(`
      SELECT mp.id, mp.station_id, mp.maintenance_type, mp.next_execution_date,
             mp.assignee_id, s.name AS station_name, s.client_id, s.project_id
      FROM station_maintenance_plans mp
      LEFT JOIN installed_stations s ON s.id = mp.station_id
      WHERE date(mp.next_execution_date) <= date('now', '+3 days')
        AND mp.status NOT IN ('COMPLETED', 'IN_PROGRESS')
    `);
    const plans: any[] = [];
    while (stmt.step()) plans.push(stmt.getAsObject());
    stmt.free();

    for (const plan of plans) {
      
      const existsStmt = db.prepare(`
        SELECT id FROM service_tickets
        WHERE station_id = ? AND title LIKE ? AND status NOT IN ('resolved', 'closed', 'cancelled')
      `);
      existsStmt.bind([plan.station_id, `Mentenanță planificată: ${plan.maintenance_type}%`]);
      const exists = existsStmt.step();
      existsStmt.free();
      if (exists) continue;

      const year = new Date().getFullYear();
      const numStmt = db.prepare("SELECT COUNT(*) FROM service_tickets WHERE ticket_number LIKE ?");
      numStmt.bind([`SRV-${year}-%`]);
      let n = 0;
      if (numStmt.step()) n = numStmt.get()[0] as number;
      numStmt.free();
      const ticketNum = `SRV-${year}-${String(n + 1).padStart(5, '0')}`;

      const dueDate = plan.next_execution_date;
      const sla = (() => {
        const d = new Date();
        d.setHours(d.getHours() + 72);
        return d.toISOString();
      })();

      try {
        db.run(
          `INSERT INTO service_tickets (
            ticket_number, station_id, project_id, client_id,
            severity, status, title, description,
            reported_via, assigned_user_id, sla_due_at, is_billable, created_by
          ) VALUES (?, ?, ?, ?, 'medium', 'open', ?, ?, 'auto', ?, ?, 1, 1)`,
          [ticketNum, plan.station_id, plan.project_id, plan.client_id,
           `Mentenanță planificată: ${plan.maintenance_type} (${plan.station_name || `stația #${plan.station_id}`})`,
           `Tichet generat automat din planul de mentenanță. Termen: ${dueDate}.`,
           plan.assignee_id, sla],
        );
        created++;
      } catch (err) {
        console.error('[maintenance-cron] ticket insert failed:', err);
      }
    }

    if (created > 0) save();
  } catch (e) {
    console.error('[maintenance-cron] failed:', e);
  }
  return { created };
}

let maintenanceTimer: NodeJS.Timeout | null = null;
let exchangeRateTimer: NodeJS.Timeout | null = null;

export function startScheduler(db: Database, save: () => void): void {
  
  
  
  
  if (!escalationTimer) {
    escalationTimer = setInterval(() => {
      try { runEscalationStep(db, save); } catch (e) { console.error('[scheduler] escalation failed:', e); }
      try { PersonalTasksService.sweepDeadlineNotifications(db); save(); } catch (e) { console.error('[scheduler] task deadlines failed:', e); }
      try {
        const flipped = DeplasariService.autoMarkReturned(db);
        if (flipped.length > 0) { console.log(`[scheduler] auto-marcat ${flipped.length} deplasare(i) ca "intors" (data întoarcerii trecută)`); save(); }
      } catch (e) { console.error('[scheduler] deplasari auto-return failed:', e); }
    }, 15 * 60 * 1000);


    setTimeout(() => {
      try { PersonalTasksService.sweepDeadlineNotifications(db); save(); } catch {  }
      // Boot catch-up: flip any trips whose return date passed while the server was down.
      try {
        const flipped = DeplasariService.autoMarkReturned(db);
        if (flipped.length > 0) { console.log(`[boot] auto-marcat ${flipped.length} deplasare(i) ca "intors" (data întoarcerii trecută)`); save(); }
      } catch {  }
    }, 5000);
  }
  
  if (!maintenanceTimer) {
    maintenanceTimer = setInterval(() => {
      try { runMaintenanceStep(db, save); } catch (e) { console.error('[scheduler] maintenance failed:', e); }
    }, 6 * 60 * 60 * 1000);
    
    setTimeout(() => { try { runMaintenanceStep(db, save); } catch {  } }, 30000);
  }
  
  if (!dailyTimer) {
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(8, 0, 0, 0);
      if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
      const ms = next.getTime() - now.getTime();
      dailyTimer = setTimeout(async () => {
        try { await runDailyStep(db, save); } catch (e) { console.error('[scheduler] daily failed:', e); }
        dailyTimer = null;
        scheduleNext();
      }, ms);
    };
    scheduleNext();
  }
  
  
  
  // BNR EUR/RON refresh retras — aplicația e mono-monedă (lei), nu mai există
  // conversie valutară de sincronizat. (fostul timer zilnic la 13:30 + boot refresh)
  void ExchangeRateService;
}

export function stopScheduler(): void {
  if (escalationTimer) { clearInterval(escalationTimer); escalationTimer = null; }
  if (dailyTimer) { clearTimeout(dailyTimer); dailyTimer = null; }
  if (maintenanceTimer) { clearInterval(maintenanceTimer); maintenanceTimer = null; }
  if (exchangeRateTimer) { clearTimeout(exchangeRateTimer); exchangeRateTimer = null; }
}
