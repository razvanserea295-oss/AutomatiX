




import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from '@/config/localStorage';
import { getServerUrl } from '@/config/server';





function deriveAiUrl(): string {
  const serverUrl = getServerUrl();
  if (!serverUrl) return 'http://127.0.0.1:8100';
  try {
    const u = new URL(serverUrl);
    
    
    if (!u.port || u.port === '443' || u.port === '80') {
      return `${u.origin}/ai`;
    }
    
    u.port = '8100';
    return u.origin;
  } catch {
    return 'http://127.0.0.1:8100';
  }
}

export function getAiServiceUrl(): string {
  const stored = getStorage(STORAGE_KEYS.AI_SERVICE_URL);
  
  
  if (stored && /(^|\/\/)localhost(:|\/|$)/.test(stored)) {
    return stored.replace(/localhost/g, '127.0.0.1');
  }
  return stored || deriveAiUrl();
}









function isAllowedAiHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  
  
  try {
    const serverUrl = getServerUrl();
    if (serverUrl) {
      const su = new URL(serverUrl);
      if (su.hostname.toLowerCase() === h) return true;
    }
  } catch {  }
  
  
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  const m = h.match(/^172\.(\d+)\./);
  if (m) {
    const oct = Number(m[1]);
    if (oct >= 16 && oct <= 31) return true;
  }
  return false;
}

export function setAiServiceUrl(url: string): void {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) {
    removeStorage(STORAGE_KEYS.AI_SERVICE_URL);
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('URL invalid pentru serviciul AI.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('AI service URL trebuie să folosească http:// sau https://');
  }
  if (!isAllowedAiHost(parsed.hostname)) {
    throw new Error(
      `Host nepermis (${parsed.hostname}). AI service trebuie să ruleze pe ` +
      `localhost, în rețeaua locală (10.x, 192.168.x, 172.16-31.x) sau ` +
      `pe același host ca serverul PROMIX.`
    );
  }
  setStorage(STORAGE_KEYS.AI_SERVICE_URL, trimmed);
}

export function getAiServiceToken(): string {
  return getStorage(STORAGE_KEYS.AI_SERVICE_TOKEN);
}

export function setAiServiceToken(token: string): void {
  const trimmed = token.trim();
  if (trimmed) {
    setStorage(STORAGE_KEYS.AI_SERVICE_TOKEN, trimmed);
  } else {
    removeStorage(STORAGE_KEYS.AI_SERVICE_TOKEN);
  }
}

function authHeaders(): Record<string, string> {
  const tok = getAiServiceToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}





export interface AiMessage {
  role: string;
  content: string;
}

















const AI_SYSTEM_PROMPT = `Esti asistentul PROMIX Automatix — fabrica statii de betoane. Raspunde IN ROMANA, scurt.

REGULI:
1. Esti READ-ONLY. NU poti modifica nimic. Daca userul cere create/update/delete/move/etc., raspunde-i ca trebuie sa o faca singur din UI.
2. Pentru date din sistem, apeleaza IMEDIAT query_database. Listeaza coloanele explicit (NU folosi 'SELECT *'). Foloseste schema de mai jos — NU presupune coloane care nu sunt listate.
3. Tabelele cu PII (users, sessions, audit_logs, daily_briefings) sunt blocate — nu incerca sa le interoghezi.
4. După fiecare tool call, CITESTE rezultatul. Daca primesti 'no such column' verifică schema. Daca apare cheia "error" cu alt mesaj, explica userului ce s-a intamplat. NU pretinde ca tabela lipseste fără sa fi consultat schema.
5. Raspunde cu datele reale (id-uri, valori intoarse) — nu texte generice. Citeaza explicit ce ai gasit.
6. Nu apela acelasi tool cu aceiasi parametri de doua ori. Daca un query a eșuat, schimba coloanele/conditiile după schema.

DATE: foloseste mereu format ISO YYYY-MM-DD. Pentru 'luna curenta' converteste tu in date efective (ex: '2026-05-01' pana '2026-05-31'), niciodata stringuri ca 'CURRENT_MONTH'.

METRICI: stoc critic daca stock <= min_stock. Marja sanatoasa > 20%.

TABELE DISPONIBILE (coloane:tip):
sales_leads(id, client_name, contact_person, contact_email, contact_phone, product_interest, estimated_value:REAL, location, status, notes, last_contact_date, next_followup_date, assigned_to, converted_project_id, created_by, created_at, updated_at)
sales_lead_notes(id, lead_id, content, created_by, created_at)
lead_attachments(id, lead_id, kind, filename, data, caption, created_by_user_id, created_at)
projects(id, name, client_id, status, stage_id, priority, manager_id, description, estimated_value:REAL, estimated_cost:REAL, actual_cost:REAL, deadline, start_date, end_date, created_at, updated_at, version)
project_pieces(id, project_id, stage_id, name, category, specs, quantity:REAL, status, parent_piece_id, sort_order, assembly_key, production_tracking, hall_notes, fulfillment_type, fulfillment_status, source_file_name, source_file_path, supplier_code, created_at, updated_at)
project_custom_stages(id, project_id, name, order_index, description, status, created_at, updated_at)
project_revenues(id, project_id, amount:REAL, source, date, notes, created_by, created_at)
project_expenses(id, project_id, category, description, amount:REAL, currency, date, invoice_ref, notes, created_by, created_at)
clients(id, name, contact_person, phone, email, city, county, notes, cui, reg_com, address, bank_name, iban, created_at, updated_at)
suppliers(id, name, contact_person, email, phone, notes, cui, address, website, category, products, payment_terms, active:INTEGER, created_at, updated_at)
materials(id, code, name, unit, unit_cost:REAL, stock:REAL, min_stock:REAL, category, supplier, location, created_at, updated_at)
material_consumptions(id, project_id, material_id, stage_id, quantity:REAL, unit_cost:REAL, loss_rate:REAL, date, notes, created_by, created_at, project_piece_id)
purchase_orders(id, supplier_id, project_id, status, internal_ref, ordered_at, created_by)
finance_invoices(id, invoice_number, project_id, client_id, type, status, currency, subtotal:REAL, tva_rate:REAL, tva_amount:REAL, total:REAL, paid_amount:REAL, issue_date, due_date, paid_date, notes, created_by, created_at, updated_at)
personal_tasks(id, user_id, title, description, status, priority, due_date, project_id, source_type, source_id, completed_at, assigned_by_user_id, instructions, notes, completion_note, completion_status, completed_by_user_id, clarification_pending, created_at, updated_at)
quotations(id, quotation_number, lead_id, project_id, client_id, client_name, contact_email, title, description, currency, tva_rate:REAL, discount_percent:REAL, subtotal:REAL, tva_amount:REAL, total:REAL, status, valid_until, sent_at, viewed_at, decided_at, rejection_reason, tracking_token, converted_contract_id, notes, created_by, created_at, updated_at)
rfqs(id, rfq_number, project_id, title, description, deadline, status, awarded_supplier_id, notes, created_by, created_at, updated_at)
rfq_items(id, rfq_id, material_id, description, quantity:REAL, unit, notes, line_no)
documents(id, project_id, category_id, name, file_type, file_size:INTEGER, file_path, original_name, version, uploaded_by, uploaded_at, updated_at, file_mime, is_private:INTEGER)
piece_services(id, project_id, project_piece_id, title, defect, service_description, technician_id, service_date, labor_cost:REAL, parts_cost:REAL, status, notes, created_at, updated_at)
service_tickets(id, ticket_number, station_id, project_id, client_id, severity, status, title, description, reported_via, reported_by_name, assigned_user_id, sla_due_at, first_response_at, resolved_at, closed_at, resolution_notes, cost_labor:REAL, cost_parts:REAL, cost_total:REAL, is_billable:INTEGER, invoice_id, created_by, created_at, updated_at)
project_briefings(id, title, project_id, created_by_user_id, assigned_to_user_id, scope, technical_requirements, client_expectations, deadline, priority, attachments_json, status, rejection_reason, completed_at, created_at, updated_at)
briefing_clarifications(id, briefing_id, asked_by_user_id, question, asked_at, answered_by_user_id, answer, answered_at, status, created_at, updated_at)
roles(id, name, description, permissions, created_at, updated_at)

SEMANTICA STATUSURI:
- sales_leads.status: 'fara_contact', 'decizie_client', 'decizie_noastra', 'in_negocieri', 'convertit'
- projects.status: 'ofertă', 'in_lucru', 'finalizat', 'anulat', 'blocat', 'întârziat'
- project_pieces.status: 'planificat', 'in_productie', 'fabricat', 'livrat', 'montat', 'testat'
- finance_invoices.status: 'draft', 'sent', 'partial', 'paid', 'overdue'

CONVENTII:
- 'pipeline vanzari activ': WHERE sales_leads.status != 'convertit'
- 'proiecte active': WHERE projects.status NOT IN ('finalizat', 'anulat')
- 'stoc critic': WHERE materials.stock <= materials.min_stock`;

export interface AiChatResponse {
  reply: string;
  tools_used: string[];
  session_id: string;
  iterations: number;
}


export interface AiQueueSnapshot {
  
  active: number;
}





export async function aiChat(
  messages: AiMessage[],
  sessionId: string,
): Promise<AiChatResponse> {
  const url = `${getAiServiceUrl()}/chat`;

  
  
  
  const userToken = getStorage(STORAGE_KEYS.TOKEN) || null;

  
  
  
  
  
  
  const messagesWithSystem: AiMessage[] = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system', content: AI_SYSTEM_PROMPT }, ...messages];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ messages: messagesWithSystem, session_id: sessionId, user_token: userToken }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`AI service error ${res.status}: ${text}`);
  }

  return res.json() as Promise<AiChatResponse>;
}

export async function aiHealth(): Promise<boolean> {
  try {
    const url = `${getAiServiceUrl()}/health`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}









export async function aiQueueDepth(): Promise<AiQueueSnapshot | null> {
  try {
    const url = `${getAiServiceUrl()}/queue`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    return res.json() as Promise<AiQueueSnapshot>;
  } catch {
    return null;
  }
}
