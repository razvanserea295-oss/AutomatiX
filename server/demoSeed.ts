











import type { Database } from 'sql.js';
import { hashPassword } from '../electron/security/password';

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demodemo'; 


export const DEMO_CREDENTIALS = { username: DEMO_USERNAME, password: DEMO_PASSWORD };


function tableCount(db: Database, table: string): number {
  try { const r = db.exec(`SELECT COUNT(*) FROM ${table}`); return Number(r[0]?.values[0][0] ?? 0); }
  catch { return -1; }
}
function colExists(db: Database, table: string, col: string): boolean {
  try { return db.exec(`PRAGMA table_info(${table})`)[0]?.values.some(v => v[1] === col) ?? false; }
  catch { return false; }
}
function ids(db: Database, sql: string): number[] {
  try { const r = db.exec(sql); return (r[0]?.values ?? []).map(v => Number(v[0])); } catch { return []; }
}
function lastId(db: Database): number {
  const s = db.prepare('SELECT last_insert_rowid()'); s.step(); const id = Number(s.get()[0]); s.free(); return id;
}
function roleId(db: Database, name: string, fallback: number): number {
  try { const r = db.exec(`SELECT id FROM roles WHERE LOWER(name)='${name}'`); return Number(r[0]?.values[0]?.[0] ?? fallback); }
  catch { return fallback; }
}


const now = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const isoTs = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);
const daysAgo = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };
const pick = <T>(arr: T[], i: number): T => arr[i % arr.length];

export async function seedDemoData(db: Database): Promise<void> {
  
  
  
  
  if (ids(db, "SELECT id FROM users WHERE username = 'demo'").length > 0) {
    console.log('[demo] already seeded (demo user present) — skipping');
    return;
  }
  void tableCount;
  console.log('[demo] seeding fictional presentation data…');

  const managerRole = roleId(db, 'manager', 3);
  const userRole = roleId(db, 'user', 2);
  const hasMustChange = colExists(db, 'users', 'must_change_password');

  
  const demoHash = await hashPassword(DEMO_PASSWORD);
  const userCols = `username, email, password_hash, full_name, role_id, active${hasMustChange ? ', must_change_password' : ''}`;
  const userVals = `?, ?, ?, ?, ?, 1${hasMustChange ? ', 0' : ''}`;
  const insUser = (username: string, fullName: string, role: number) =>
    db.run(`INSERT INTO users (${userCols}) VALUES (${userVals})`,
      [username, `${username}@demo.local`, demoHash, fullName, role]);

  
  
  
  
  const viewerRole = roleId(db, 'viewer', managerRole);
  insUser(DEMO_USERNAME, 'Cont Demo (prezentare)', viewerRole);

  const people = [
    ['ana.maria', 'Ana Maria Ionescu'], ['ion.stanescu', 'Ion Stănescu'],
    ['mihai.dumitru', 'Mihai Dumitru'], ['adrian.popa', 'Adrian Popa'],
    ['ionel.cosma', 'Ionel Cosma'], ['paul.gheorghe', 'Paul Gheorghe'],
  ];
  for (const [u, n] of people) insUser(u, n, userRole);
  const userIds = ids(db, 'SELECT id FROM users ORDER BY id');
  const adminId = userIds[0] ?? 1;

  
  const clients: [string, string, string, string, string, string, string][] = [
    ['Agro Industrial Group SA', 'Paul Dumitrescu', '0722 100 200', 'office@agroind.ro', 'Slobozia', 'Ialomița', 'Client major — silozuri și linii de dozare.'],
    ['Green Valley Construct SRL', 'Monica Radu', '0732 200 300', 'monica@greenvalley.ro', 'Ploiești', 'Prahova', 'Hale industriale și structuri metalice.'],
    ['MetalWork Transilvania SRL', 'George Crișan', '0743 300 400', 'george@metalwork.ro', 'Cluj-Napoca', 'Cluj', 'Subcontractor structuri.'],
    ['Eco Industries SA', 'Daniela Popa', '0754 400 500', 'daniela@ecoind.ro', 'Timișoara', 'Timiș', 'Linii de producție eco-pavele.'],
    ['PortLog SA', 'Iulian Maftei', '0765 500 600', 'iulian@portlog.ro', 'Constanța', 'Constanța', 'Platforme logistice și cântare.'],
    ['Fabrica de Zahăr Oradea SA', 'Bogdan Negoiță', '0787 600 700', 'bogdan@fzo.ro', 'Oradea', 'Bihor', 'Modernizare linii tehnologice.'],
    ['LactoPro SA', 'Alina Popescu', '0798 700 800', 'alina@lactopro.ro', 'Sibiu', 'Sibiu', 'Linie procesare lapte.'],
    ['Hydro Energy SRL', 'Radu Marin', '0720 800 900', 'office@hydroenergy.ro', 'Craiova', 'Dolj', 'Echipamente hidro.'],
    ['Ferro System SRL', 'Cristina Matei', '0731 900 100', 'cristina@ferrosystem.ro', 'Iași', 'Iași', 'Platforme și pasarele metalice.'],
    ['Indus Park Development', 'Sorin Iliescu', '0742 100 300', 'sorin@induspark.ro', 'Brașov', 'Brașov', 'Parc industrial — structuri multiple.'],
  ];
  for (const c of clients) db.run('INSERT INTO clients (name, contact_person, phone, email, city, county, notes) VALUES (?,?,?,?,?,?,?)', c);
  const clientIds = ids(db, 'SELECT id FROM clients ORDER BY id');

  
  const materials: [string, string, string, number, number, number, string, string][] = [
    ['PRF-100', 'Profil HEA 100', 'kg', 6.8, 4200, 500, 'profile', 'MetalDistrib SRL'],
    ['PRF-200', 'Profil HEB 200', 'kg', 7.2, 3100, 400, 'profile', 'MetalDistrib SRL'],
    ['TBL-3', 'Tablă galvanizată 3mm', 'mp', 95, 320, 50, 'table', 'SteelPro SA'],
    ['TBL-5', 'Tablă inox 5mm', 'mp', 240, 80, 20, 'table', 'SteelPro SA'],
    ['OB-12', 'Oțel beton Ø12', 'kg', 4.1, 8500, 1000, 'beton', 'BetonMix Industries'],
    ['SUR-M16', 'Șurub M16x60', 'buc', 2.4, 5400, 800, 'fixare', 'FixFast Distribution'],
    ['VOP-ANT', 'Vopsea anticorozivă', 'l', 38, 240, 40, 'vopsea', 'PaintPro Industrial'],
    ['MOT-55', 'Motor electric 5.5kW', 'buc', 1850, 12, 3, 'electrice', 'TechMotor Industries'],
    ['RLM-6204', 'Rulment 6204', 'buc', 28, 180, 30, 'mecanice', 'MechParts Distribution'],
    ['PAN-SW', 'Panou sandwich 100mm', 'mp', 110, 420, 60, 'izolatii', 'WallTech Panels'],
  ];
  for (const m of materials) db.run('INSERT INTO materials (code, name, unit, unit_cost, stock, min_stock, category, supplier) VALUES (?,?,?,?,?,?,?,?)', m);
  const materialIds = ids(db, 'SELECT id FROM materials ORDER BY id');

  
  const stageIds = ids(db, 'SELECT id FROM project_stages ORDER BY id');
  const stage = (i: number) => stageIds.length ? pick(stageIds, i) : 1;
  const projNames = [
    'Stație betoane 60 mc/h', 'Hală structură metalică 3500 mp', 'Silozuri cereale 4×200t',
    'Linie eco-pavele', 'Platformă logistică + cântar 60t', 'Modernizare linie zahăr',
    'Linie procesare lapte 3000 L/zi', 'Echipament hidro + montaj', 'Pasarelă pietonală 60m',
    'Structuri parc industrial — etapa 1',
  ];
  const projStatus = ['active', 'in_progress', 'active', 'completed', 'in_progress', 'active', 'on_hold', 'active', 'completed', 'in_progress'];
  const projPrio = ['high', 'medium', 'high', 'low', 'medium', 'high', 'medium', 'low', 'medium', 'high'];
  projNames.forEach((name, i) => {
    const est = 180000 + i * 60000;
    db.run(
      `INSERT INTO projects (name, client_id, status, stage_id, priority, manager_id, description, estimated_value, estimated_cost, actual_cost, deadline, start_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, pick(clientIds, i), projStatus[i], stage(i), projPrio[i], pick(userIds, i + 1),
        'Proiect demo — echipament industrial complet, inclusiv montaj și PIF.',
        est, est * 0.62, est * (i % 3 === 0 ? 0.4 : 0.15),
        iso(daysAgo(-30 - i * 7)), iso(daysAgo(50 - i * 3))],
    );
  });
  const projectIds = ids(db, 'SELECT id FROM projects ORDER BY id');

  
  const runMany = (table: string, rows: any[][], sql: string) => {
    for (const r of rows) { try { db.run(sql, r); } catch (e) { console.warn(`[demo] ${table} insert skipped:`, e instanceof Error ? e.message : e); } }
    console.log(`  ${table.padEnd(22)} + ${rows.length}`);
  };

  runMany('suppliers', [
    ['MetalDistrib SRL', 'Cristian Marin', 'cristian@metaldistrib.ro', '0722 100 200', 'Furnizor principal profile și corniere.'],
    ['SteelPro SA', 'Laura Dobre', 'laura@steelpro.ro', '0733 200 300', 'Tablă galvanizată și inox.'],
    ['BetonMix Industries', 'Mihai Radu', 'office@betonmix.ro', '0744 300 400', 'Oțel beton și ciment.'],
    ['FixFast Distribution', 'Elena Voicu', 'comenzi@fixfast.ro', '0755 400 500', 'Elemente de fixare.'],
    ['ElectroDist SRL', 'Andrei Pop', 'andrei@electrodist.ro', '0766 500 600', 'Cabluri și componente electrice.'],
    ['TechMotor Industries', 'Diana Neagu', 'vanzari@techmotor.ro', '0777 600 700', 'Motoare electrice și reductoare.'],
    ['PaintPro Industrial', 'Marcela Stan', 'office@paintpro.ro', '0799 800 900', 'Vopsele anticorozive.'],
    ['WallTech Panels', 'Sorin Iliescu', 'sales@walltech.ro', '0731 100 200', 'Panouri sandwich și izolații.'],
  ], 'INSERT INTO suppliers (name, contact_person, email, phone, notes) VALUES (?,?,?,?,?)');

  const sampleComments = [
    'Asamblarea decurge conform planului. Încă 2 zile pentru finalizare.',
    'Sudura în grafic — grinzile principale sunt 90% complete.',
    'Furnizorul a întârziat materialele. Discutat cu clientul.',
    'Vopsirea decurge bine. Așteptăm uscare completă pentru layer 2.',
    'Testare finală programată pentru săptămâna viitoare. Clientul va fi prezent.',
    'Montaj conform plan. Baze deja ancorate.',
  ];
  const comments: any[][] = [];
  projectIds.forEach((pid, i) => { for (let c = 0; c < 2 + (i % 2); c++) comments.push([pid, null, pick(userIds, i + c), pick(sampleComments, i * 3 + c), isoTs(daysAgo(30 - (i + c) * 2))]); });
  runMany('project_comments', comments, 'INSERT INTO project_comments (project_id, stage_id, user_id, content, created_at) VALUES (?,?,?,?,?)');

  const revenues: any[][] = [];
  projectIds.forEach((pid, i) => { const est = 120000 + i * 45000; revenues.push([pid, est, 'estimated', iso(daysAgo(60 + i * 2)), 'Valoare estimată inițial', adminId]); if (i % 3 === 0) revenues.push([pid, est * 0.4, 'invoiced', iso(daysAgo(20 + i)), 'Avans la contract', adminId]); });
  runMany('project_revenues', revenues, 'INSERT INTO project_revenues (project_id, amount, source, date, notes, created_by) VALUES (?,?,?,?,?,?)');

  const cats = ['materiale', 'manopera', 'transport', 'subcontractori', 'altele'] as const;
  const amt: Record<string, number[]> = { materiale: [25000, 30000, 35000], manopera: [8000, 10000, 12000], transport: [1500, 1900, 2300], subcontractori: [12000, 15000, 18000], altele: [800, 1000, 1200] };
  const expenses: any[][] = [];
  projectIds.forEach((pid, i) => { for (let k = 0; k < 3; k++) { const cat = pick(cats as unknown as string[], i + k); expenses.push([pid, cat, `Cheltuială ${cat} — lună ${(i + k) % 6 + 1}`, amt[cat][k], 'RON', iso(daysAgo(45 - k * 8)), `INV-${2000 + i * 10 + k}`, null, adminId]); } });
  runMany('project_expenses', expenses, 'INSERT INTO project_expenses (project_id, category, description, amount, currency, date, invoice_ref, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?)');

  const invoices: any[][] = [];
  projectIds.forEach((pid, i) => { const cid = pick(clientIds, i); const sub = 50000 + i * 12000; const tva = sub * 0.19; const total = sub + tva; const st = i % 4 === 0 ? 'paid' : (i % 4 === 1 ? 'sent' : (i % 4 === 2 ? 'draft' : 'overdue')); const paid = st === 'paid' ? total : (st === 'overdue' ? total * 0.3 : 0); invoices.push([`FACT-2026-${String(100 + i).padStart(4, '0')}`, pid, cid, 'emisa', st, 'RON', sub, 0.19, tva, total, paid, iso(daysAgo(45 - i * 2)), iso(daysAgo(15 - i * 2)), st === 'paid' ? iso(daysAgo(5 - (i % 3))) : null, i % 2 === 0 ? 'Plata la termen' : 'Facturare etape', adminId]); });
  runMany('finance_invoices', invoices, 'INSERT INTO finance_invoices (invoice_number, project_id, client_id, type, status, currency, subtotal, tva_rate, tva_amount, total, paid_amount, issue_date, due_date, paid_date, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

  const cities = ['București', 'Cluj-Napoca', 'Timișoara', 'Brașov', 'Iași', 'Constanța', 'Oradea', 'Craiova'];
  const contracts: any[][] = [];
  projectIds.forEach((pid, i) => { contracts.push([pid, `CTR-2026-${String(100 + i).padStart(3, '0')}`, `Contract proiect #${pid}`, pick(clientIds, i), pick(cities, i), 'Stație / utilaj industrial complet, inclusiv montaj și PIF', 120000 + i * 35000, '6 luni de la data contractului', '30 zile post livrare', pick(['active', 'amended', 'active', 'closed'], i), 1, i % 2 === 0 ? null : 'Livrare eșalonată pe 3 tranșe.', adminId]); });
  runMany('contracts', contracts, 'INSERT INTO contracts (project_id, contract_code, title, client_id, site_location, delivered_product, sale_price, execution_term, pif_term, status, revision, observations, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');

  if (materialIds.length) {
    const cons: any[][] = [];
    projectIds.forEach((pid, i) => { for (let k = 0; k < 3 && k < materialIds.length; k++) cons.push([pid, pick(materialIds, i + k), null, 25 + k * 10, 85 + k * 15, 0.05, iso(daysAgo(30 - k * 5)), 'Consum etapă producție', adminId, null]); });
    runMany('material_consumptions', cons, 'INSERT INTO material_consumptions (project_id, material_id, stage_id, quantity, unit_cost, loss_rate, date, notes, created_by, project_piece_id) VALUES (?,?,?,?,?,?,?,?,?,?)');
  }

  const leads: any[][] = [
    ['AgroFerm Câmpia SRL', 'Paul Dumitrescu', 'paul@agroferm.ro', '0721 500 600', 'Silozuri cereale 4×200t', 480000, 'Slobozia, Ialomița', 'in_negocieri', 'Client nou, interesat de ofertă completă.', iso(daysAgo(5)), iso(daysAgo(-7))],
    ['Nord Construct SRL', 'Monica Radu', 'monica@nordconstruct.ro', '0732 600 700', 'Hală industrială 3500 mp', 620000, 'Ploiești', 'decizie_client', 'Ofertă trimisă, așteptăm feedback.', iso(daysAgo(10)), iso(daysAgo(-3))],
    ['MetalWork Vest SRL', 'George Crișan', 'george@metalvest.ro', '0743 700 800', 'Structură metalică 800 mp', 180000, 'Cluj-Napoca', 'fara_contact', 'Contact inițial.', null, iso(daysAgo(-14))],
    ['Eco Pavaje SA', 'Daniela Popa', 'daniela@ecopavaje.ro', '0754 800 900', 'Linie producție eco-pavele', 320000, 'Timișoara', 'in_negocieri', 'Solicită vizită tehnică.', iso(daysAgo(3)), iso(daysAgo(-10))],
    ['PortLog Terminal SA', 'Iulian Maftei', 'iulian@portterminal.ro', '0765 900 000', 'Platformă + cântar 60t', 290000, 'Constanța', 'in_negocieri', 'Discuții avansate.', iso(daysAgo(2)), iso(daysAgo(-5))],
    ['Primăria Sector 6', 'Cristina Matei', 'cristina.m@ps6.ro', '0776 000 100', 'Pasarelă pietonală 60m', 160000, 'București', 'decizie_noastra', 'Licitație publică, dosar depus.', iso(daysAgo(7)), iso(daysAgo(20))],
    ['Rafinăria Sud SA', 'Bogdan Negoiță', 'bogdan@rafsud.ro', '0787 100 200', 'Înlocuire linii tehnologice', 890000, 'Oradea', 'fara_contact', 'Lead din târg.', null, iso(daysAgo(-21))],
    ['LactoPlus SA', 'Alina Popescu', 'alina@lactoplus.ro', '0798 200 300', 'Linie procesare lapte 3000 L/zi', 410000, 'Sibiu', 'convertit', 'Convertit în proiect.', iso(daysAgo(1)), iso(daysAgo(-4))],
  ].map((r, i) => [...r, pick(userIds, i + 1), adminId]);
  runMany('sales_leads', leads, 'INSERT INTO sales_leads (client_name, contact_person, contact_email, contact_phone, product_interest, estimated_value, location, status, notes, last_contact_date, next_followup_date, assigned_to, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');

  const trips: any[][] = [
    ['Ion Stănescu', 'București → Cluj-Napoca', 'Vizită client — negociere contract', projectIds[1], isoTs(daysAgo(15)), isoTs(daysAgo(13)), 'finalizat', 'Contract semnat.'],
    ['Mihai Dumitru', 'București → Timișoara', 'Inspecție șantier', projectIds[3], isoTs(daysAgo(8)), isoTs(daysAgo(7)), 'finalizat', 'Progres conform planului.'],
    ['Ion Stănescu', 'București → Brașov', 'Întâlnire — modificări proiect', projectIds[2], isoTs(daysAgo(4)), isoTs(daysAgo(3)), 'finalizat', null],
    ['Adrian Popa', 'București → Iași', 'Montaj platformă', projectIds[5], isoTs(daysAgo(2)), null, 'in_deplasare', 'În desfășurare.'],
    ['Mihai Dumitru', 'București → Constanța', 'Recepție parțială', projectIds[4], isoTs(daysAgo(1)), null, 'in_deplasare', null],
    ['Ion Stănescu', 'București → Craiova', 'Închidere proiect', projectIds[7], isoTs(daysAgo(0)), isoTs(daysAgo(-1)), 'planificat', 'Recepție finală + factură.'],
  ].map(r => [...r, adminId]);
  runMany('deplasari', trips, 'INSERT INTO deplasari (person_name, destination, reason, project_id, departure_date, return_date, status, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?)');

  const supplierIds = ids(db, 'SELECT id FROM suppliers ORDER BY id');
  if (supplierIds.length) {
    const pos = projectIds.slice(0, 6).map((pid, i) => [pick(supplierIds, i), pid, pick(['open', 'confirmed', 'delivered', 'closed'], i), `INT-PO-2026-${String(100 + i).padStart(3, '0')}`, isoTs(daysAgo(40 - i * 4)), adminId]);
    runMany('purchase_orders', pos, 'INSERT INTO purchase_orders (supplier_id, project_id, status, internal_ref, ordered_at, created_by) VALUES (?,?,?,?,?,?)');
  }

  
  const demoUserId = ids(db, "SELECT id FROM users WHERE username = 'demo'")[0] ?? adminId;

  
  const quoteStatus = ['accepted', 'sent', 'viewed', 'draft', 'rejected', 'sent', 'expired', 'accepted'];
  const quotes: any[][] = clientIds.slice(0, 8).map((cid, i) => {
    const sub = 80000 + i * 30000; const tva = sub * 0.21;
    return [`OFR-2026-${String(100 + i).padStart(4, '0')}`, cid, clients[i % clients.length][0],
      `Ofertă echipament industrial #${100 + i}`, 'Stație / linie completă inclusiv montaj și PIF.',
      'RON', 0.21, sub, tva, sub + tva, pick(quoteStatus, i), iso(daysAgo(-30 + i * 4)),
      `demo-qtok-${i}`, adminId];
  });
  runMany('quotations', quotes, 'INSERT INTO quotations (quotation_number, client_id, client_name, title, description, currency, tva_rate, subtotal, tva_amount, total, status, valid_until, tracking_token, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

  
  const tickets: any[][] = projectIds.slice(0, 8).map((pid, i) => [
    `TKT-2026-${String(100 + i).padStart(4, '0')}`, pid, pick(clientIds, i),
    pick(['low', 'medium', 'high', 'critical'], i), pick(['open', 'in_progress', 'resolved', 'closed', 'open'], i),
    `Sesizare service #${100 + i}`, 'Defecțiune raportată la echipamentul livrat — necesită intervenție.',
    'phone', pick(userIds, i + 1), adminId]);
  runMany('service_tickets', tickets, 'INSERT INTO service_tickets (ticket_number, project_id, client_id, severity, status, title, description, reported_via, assigned_user_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)');

  
  const taskTitles = ['Pregătește oferta pentru AgroFerm', 'Sună clientul Green Valley', 'Verifică desenele DXF etapa 2', 'Comandă profile HEA 200', 'Programează recepția la Eco Industries', 'Trimite factura FACT-2026-0103', 'Update status proiect silozuri', 'Revizuiește contractul CTR-2026-102'];
  const tasks: any[][] = taskTitles.map((t, i) => [
    i % 2 === 0 ? demoUserId : pick(userIds, i), t, 'Task demo de prezentare.',
    pick(['open', 'in_progress', 'open', 'done'], i), pick(['low', 'normal', 'high'], i),
    iso(daysAgo(-2 - i)), pick(projectIds, i)]);
  runMany('personal_tasks', tasks, 'INSERT INTO personal_tasks (user_id, title, description, status, priority, due_date, project_id) VALUES (?,?,?,?,?,?,?)');

  
  const events: any[][] = [
    [demoUserId, 'Prezentare client AgroFerm', iso(daysAgo(-2)), null, 'Demo echipament la sediu', '#10b981'],
    [demoUserId, 'Recepție proiect silozuri', iso(daysAgo(-5)), null, null, '#f59e0b'],
    [demoUserId, 'Concediu', iso(daysAgo(-10)), iso(daysAgo(-7)), 'Vacanță planificată', '#3b82f6'],
    [demoUserId, 'Ședință echipă — sync săptămânal', iso(daysAgo(1)), null, null, null],
  ];
  runMany('personal_calendar_events', events, 'INSERT INTO personal_calendar_events (user_id, title, date, end_date, notes, color) VALUES (?,?,?,?,?,?)');

  
  const briefings: any[][] = projectIds.slice(0, 6).map((pid, i) => [
    `Briefing — ${projNames[i] ?? `proiect ${i + 1}`}`, pid, adminId, demoUserId,
    'Realizează desenele de execuție și lista de materiale pentru întreg ansamblul.',
    'Profile conform calcul, suduri cf. EN 1090-2, vopsire sistem C3 (120µm).',
    'Livrare la termen, documentație completă (DXF + liste) la predare.',
    iso(daysAgo(-20 - i * 5)), pick(['medium', 'high', 'low', 'critical'], i),
    pick(['sent', 'acknowledged', 'accepted', 'completed', 'sent', 'clarification_requested'], i)]);
  runMany('project_briefings', briefings, 'INSERT INTO project_briefings (title, project_id, created_by_user_id, assigned_to_user_id, scope, technical_requirements, client_expectations, deadline, priority, status) VALUES (?,?,?,?,?,?,?,?,?,?)');

  console.log('[demo] seed complete — demo user:', DEMO_USERNAME, '/', DEMO_PASSWORD);
}
