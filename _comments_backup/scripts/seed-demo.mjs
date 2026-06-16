#!/usr/bin/env node
/**
 * Seed demo data into an EXISTING promix database.
 *
 * Strategy:
 *   - Only seeds tables that are currently empty — idempotent. Running twice
 *     does nothing the second time.
 *   - Reads existing user/project/client IDs and references them. Never
 *     assumes hardcoded IDs.
 *   - Every insert uses executable prepare/bind to avoid SQL injection risk
 *     from the seed data itself.
 *
 * Run: `node scripts/seed-demo.mjs`
 * Target DB: ~/.config/promix-automatix/data/promix.db
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DB_PATH = path.join(os.homedir(), '.config/promix-automatix/data/promix.db');

if (!fs.existsSync(DB_PATH)) {
  console.error(`DB not found at ${DB_PATH}. Run the app once to initialize.`);
  process.exit(1);
}

const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(DB_PATH));

// Safety backup before writing
const backupPath = DB_PATH.replace('.db', `.pre-seed-${Date.now()}.db`);
fs.copyFileSync(DB_PATH, backupPath);
console.log(`[backup] ${backupPath}`);

function rowCount(table) {
  try {
    const r = db.exec(`SELECT COUNT(*) FROM ${table}`);
    return r[0].values[0][0];
  } catch { return -1; }
}

function allRows(sql) {
  try {
    const r = db.exec(sql);
    if (!r[0]) return [];
    return r[0].values;
  } catch { return []; }
}

// Seed only if table is empty; log summary
function seedIfEmpty(table, rows, sqlTemplate) {
  const existing = rowCount(table);
  if (existing === -1) {
    console.log(`  ${table.padEnd(24)} — SKIPPED (table missing)`);
    return 0;
  }
  if (existing > 0) {
    console.log(`  ${table.padEnd(24)} — SKIPPED (${existing} existing)`);
    return 0;
  }
  for (const r of rows) db.run(sqlTemplate, r);
  console.log(`  ${table.padEnd(24)} + ${rows.length}`);
  return rows.length;
}

// ── Reference lookups ─────────────────────────────────────────────────────
const userIds    = allRows('SELECT id FROM users ORDER BY id').map(r => r[0]);
const adminId    = userIds[0] ?? 1;
if (userIds.length === 0) {
  console.error('No users in DB — cannot seed (every insert needs a created_by).');
  process.exit(1);
}
const projectIds = allRows('SELECT id FROM projects ORDER BY id').map(r => r[0]);
const clientIds  = allRows('SELECT id FROM clients ORDER BY id').map(r => r[0]);
const materialIds = allRows('SELECT id FROM materials ORDER BY id').map(r => r[0]);

if (projectIds.length === 0 || clientIds.length === 0) {
  console.error('No projects/clients in DB — seed script needs existing data to reference.');
  process.exit(1);
}

console.log(`[seed] Reference: ${userIds.length} users, ${projectIds.length} projects, ${clientIds.length} clients, ${materialIds.length} materials`);
console.log('');

const now = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const isoTs = (d) => d.toISOString().replace('T', ' ').slice(0, 19);
const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };
const pick = (arr, i) => arr[i % arr.length];

let inserted = 0;

// ── 1. SUPPLIERS ──────────────────────────────────────────────────────────
inserted += seedIfEmpty('suppliers', [
  ['MetalDistrib SRL', 'Cristian Marin', 'cristian@metaldistrib.ro', '0722 100 200', 'Furnizor principal profile și corniere. Livrare în 48h pentru comenzi standard.'],
  ['SteelPro SA', 'Laura Dobre', 'laura@steelpro.ro', '0733 200 300', 'Tablă galvanizată și inox. Minimum comandă 500 kg.'],
  ['BetonMix Industries', 'Mihai Radu', 'office@betonmix.ro', '0744 300 400', 'Oțel beton și ciment. Contract-cadru activ.'],
  ['FixFast Distribution', 'Elena Voicu', 'comenzi@fixfast.ro', '0755 400 500', 'Elemente de fixare — șuruburi, piulițe, bolturi. Stoc disponibil permanent.'],
  ['ElectroDist SRL', 'Andrei Pop', 'andrei@electrodist.ro', '0766 500 600', 'Cabluri și componente electrice. Motoare la comandă.'],
  ['TechMotor Industries', 'Diana Neagu', 'vanzari@techmotor.ro', '0777 600 700', 'Motoare electrice și reductoare. Service inclus.'],
  ['SensorTech SRL', 'Robert Lupu', 'info@sensortech.ro', '0788 700 800', 'Senzori și automatizări industriale.'],
  ['PaintPro Industrial', 'Marcela Stan', 'office@paintpro.ro', '0799 800 900', 'Vopsele și grunduri anticorozive. Livrare directă în șantier.'],
  ['MechParts Distribution', 'Gabriel Ursu', 'comenzi@mechparts.ro', '0720 900 100', 'Rulmenți, curele, componente mecanice.'],
  ['WallTech Panels', 'Sorin Iliescu', 'sales@walltech.ro', '0731 100 200', 'Panouri sandwich și izolații termice. Montaj la cerere.'],
], 'INSERT INTO suppliers (name, contact_person, email, phone, notes) VALUES (?, ?, ?, ?, ?)');

// ── 2. PROJECT COMMENTS ───────────────────────────────────────────────────
const comments = [];
const sampleComments = [
  'Asamblarea decurge conform planului. Încă 2 zile pentru finalizare.',
  'OK, pregătiți transportul pentru săptămâna viitoare.',
  'Sudura în grafic — grinzile principale sunt 90% complete.',
  'Verificat sudurile, totul conform standard. Atenție la cordoanele de colț.',
  'Situație critică: furnizorul a întârziat materialele cu 3 săptămâni. Discutat cu clientul.',
  'Trebuie găsit furnizor alternativ pentru componentele hidraulice.',
  'Vopsirea decurge bine. Așteptăm uscare completă pentru layer 2.',
  'Modificări cerute de client la design. Necesită redebitare piese.',
  'Testare finală programată pentru săptămâna viitoare. Clientul va fi prezent.',
  'Montaj silozuri conform plan. Baze deja ancorate.',
  'Ofertă acceptată dar clientul vrea modificări la dimensiuni. Revizuire necesară.',
  'Raport progres urcat pe server. Doamna Ionescu aprobă recepția parțială.',
];
projectIds.forEach((pid, i) => {
  // 2-3 comentarii per proiect, utilizatori și date variabile
  const count = 2 + (i % 2);
  for (let c = 0; c < count; c++) {
    comments.push([
      pid, null, pick(userIds, i + c),
      pick(sampleComments, i * 3 + c),
      isoTs(daysAgo(30 - (i + c) * 2)),
    ]);
  }
});
inserted += seedIfEmpty('project_comments', comments,
  'INSERT INTO project_comments (project_id, stage_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)');

// ── 3. PROJECT REVENUES (estimated + realized) ────────────────────────────
const revenues = [];
projectIds.forEach((pid, i) => {
  // one estimated + (for older projects) one realized
  const est = 120000 + i * 45000;
  revenues.push([pid, est, 'estimated', iso(daysAgo(60 + i * 2)), 'Valoare estimată inițial', adminId]);
  if (i % 3 === 0) {
    revenues.push([pid, est * 0.4, 'invoiced', iso(daysAgo(20 + i)), 'Avans la contract', adminId]);
  }
});
inserted += seedIfEmpty('project_revenues', revenues,
  'INSERT INTO project_revenues (project_id, amount, source, date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)');

// ── 4. PROJECT EXPENSES ───────────────────────────────────────────────────
const expenses = [];
const categories = ['materiale', 'manopera', 'transport', 'subcontractori', 'altele'];
projectIds.forEach((pid, i) => {
  for (let k = 0; k < 3; k++) {
    const cat = pick(categories, i + k);
    const amount = {
      materiale: 25000 + k * 5000,
      manopera: 8000 + k * 2000,
      transport: 1500 + k * 400,
      subcontractori: 12000 + k * 3000,
      altele: 800 + k * 200,
    }[cat];
    expenses.push([
      pid, cat, `Cheltuială ${cat} — lună ${(i + k) % 6 + 1}`,
      amount, 'RON', iso(daysAgo(45 - k * 8)),
      `INV-${2000 + i * 10 + k}`, null, adminId,
    ]);
  }
});
inserted += seedIfEmpty('project_expenses', expenses,
  'INSERT INTO project_expenses (project_id, category, description, amount, currency, date, invoice_ref, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

// ── 5. FINANCE INVOICES ───────────────────────────────────────────────────
const invoiceRows = [];
projectIds.forEach((pid, i) => {
  const cid = pick(clientIds, i);
  const subtotal = 50000 + i * 12000;
  const tvaRate = 0.19;
  const tva = subtotal * tvaRate;
  const total = subtotal + tva;
  const status = i % 4 === 0 ? 'paid' : (i % 4 === 1 ? 'sent' : (i % 4 === 2 ? 'draft' : 'overdue'));
  const paid = status === 'paid' ? total : (status === 'overdue' ? total * 0.3 : 0);
  invoiceRows.push([
    `FACT-${2026}-${String(100 + i).padStart(4, '0')}`,
    pid, cid, 'emisa', status, 'RON',
    subtotal, tvaRate, tva, total, paid,
    iso(daysAgo(45 - i * 2)), iso(daysAgo(15 - i * 2)),
    status === 'paid' ? iso(daysAgo(5 - (i % 3))) : null,
    i % 2 === 0 ? 'Plata la termen' : 'Facturare etape intermediare',
    adminId,
  ]);
});
inserted += seedIfEmpty('finance_invoices', invoiceRows,
  `INSERT INTO finance_invoices (invoice_number, project_id, client_id, type, status, currency, subtotal, tva_rate, tva_amount, total, paid_amount, issue_date, due_date, paid_date, notes, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// ── 6. CONTRACTS ──────────────────────────────────────────────────────────
const contractRows = [];
projectIds.forEach((pid, i) => {
  const cid = pick(clientIds, i);
  contractRows.push([
    pid, `CTR-${2026}-${String(100 + i).padStart(3, '0')}`,
    `Contract proiect #${pid}`, cid,
    pick(['București', 'Cluj-Napoca', 'Timișoara', 'Brașov', 'Iași', 'Constanța', 'Oradea', 'Craiova'], i),
    'Stație / utilaj industrial complet, inclusiv montaj și punere în funcțiune',
    120000 + i * 35000, '6 luni de la data contractului', '30 zile post livrare',
    pick(['draft', 'signed', 'active', 'completed'], i),
    1,
    i % 2 === 0 ? null : 'Observații: livrare eșalonată pe 3 tranșe.',
    adminId,
  ]);
});
inserted += seedIfEmpty('contracts', contractRows,
  `INSERT INTO contracts (project_id, contract_code, title, client_id, site_location, delivered_product, sale_price, execution_term, pif_term, status, revision, observations, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// ── 7. MATERIAL CONSUMPTIONS ──────────────────────────────────────────────
if (materialIds.length > 0) {
  const consumptions = [];
  projectIds.forEach((pid, i) => {
    for (let k = 0; k < 3 && k < materialIds.length; k++) {
      const mid = pick(materialIds, i + k);
      consumptions.push([
        pid, mid, null,
        25 + k * 10, 85 + k * 15, 0.05,
        iso(daysAgo(30 - k * 5)),
        `Consum etapă producție`,
        adminId, null,
      ]);
    }
  });
  inserted += seedIfEmpty('material_consumptions', consumptions,
    `INSERT INTO material_consumptions (project_id, material_id, stage_id, quantity, unit_cost, loss_rate, date, notes, created_by, project_piece_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
}

// ── 8. SALES LEADS ────────────────────────────────────────────────────────
const leadRows = [
  ['AgroFerm Câmpia SRL', 'Paul Dumitrescu', 'paul@agroferm.ro', '0721 500 600', 'Silozuri cereale 4x200t', 480000, 'Slobozia, Ialomița', 'in_negociere', 'Client nou, interesat de ofertă completă.', iso(daysAgo(5)), iso(daysAgo(-7))],
  ['Green Valley Construct', 'Monica Radu', 'monica@greenvalley.ro', '0732 600 700', 'Hală industrială 3500mp', 620000, 'Ploiești', 'ofertat', 'Ofertă trimisă, așteptăm feedback.', iso(daysAgo(10)), iso(daysAgo(-3))],
  ['MetalWork Transilvania', 'George Crișan', 'george@metalwork.ro', '0743 700 800', 'Structură metalică 800mp', 180000, 'Cluj-Napoca', 'fara_contact', 'Contact inițial prin LinkedIn.', null, iso(daysAgo(-14))],
  ['Eco Industries SA', 'Daniela Popa', 'daniela@ecoind.ro', '0754 800 900', 'Linie producție eco-pavele', 320000, 'Timișoara', 'calificat', 'Solicită vizită tehnică pentru evaluare sit.', iso(daysAgo(3)), iso(daysAgo(-10))],
  ['PortLog SA', 'Iulian Maftei', 'iulian@portlog.ro', '0765 900 000', 'Platformă logistică + cântar 60t', 290000, 'Constanța', 'in_negociere', 'Discuții avansate, clientul compară cu 2 concurenți.', iso(daysAgo(2)), iso(daysAgo(-5))],
  ['Primăria Sectorului 6', 'Cristina Matei', 'cristina.m@ps6.ro', '0776 000 100', 'Pasarelă pietonală 60m', 160000, 'București', 'ofertat', 'Licitație publică, dosar complet depus.', iso(daysAgo(7)), iso(daysAgo(20))],
  ['Fabrica Zahăr Oradea', 'Bogdan Negoiță', 'bogdan@fabricazahar.ro', '0787 100 200', 'Înlocuire linii tehnologice', 890000, 'Oradea', 'fara_contact', 'Lead din târg.', null, iso(daysAgo(-21))],
  ['LactoPro SA', 'Alina Popescu', 'alina@lactopro.ro', '0798 200 300', 'Linie procesare lapte 3000L/zi', 410000, 'Sibiu', 'calificat', 'Intenție fermă, bugetul aprobat în board.', iso(daysAgo(1)), iso(daysAgo(-4))],
].map((r, i) => [...r, pick(userIds, i), adminId]);

inserted += seedIfEmpty('sales_leads', leadRows,
  `INSERT INTO sales_leads (client_name, contact_person, contact_email, contact_phone, product_interest, estimated_value, location, status, notes, last_contact_date, next_followup_date, assigned_to, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// ── 9. DEPLASARI (business trips) ─────────────────────────────────────────
const deplasari = [
  ['Ion Stănescu', 'București → Cluj-Napoca', 'Vizită client Metal Termic — negociere contract', projectIds[1], isoTs(daysAgo(15)), isoTs(daysAgo(13)), 'finalizat', 'Contract semnat cu succes.'],
  ['Mihai Dumitru', 'București → Timișoara', 'Inspecție șantier Agro Fix', projectIds[3], isoTs(daysAgo(8)), isoTs(daysAgo(7)), 'finalizat', 'Progres conform planului.'],
  ['Ion Stănescu', 'București → Brașov', 'Întâlnire Indus Park — modificări proiect', projectIds[2], isoTs(daysAgo(4)), isoTs(daysAgo(3)), 'finalizat', null],
  ['Adrian Popa', 'București → Iași', 'Montaj platformă Ferro System', projectIds[5], isoTs(daysAgo(2)), null, 'in_deplasare', 'În desfășurare.'],
  ['Mihai Dumitru', 'București → Constanța', 'Recepție parțială Eco Build', projectIds[7], isoTs(daysAgo(1)), null, 'in_deplasare', null],
  ['Ion Stănescu', 'București → Craiova', 'Închidere proiect Hydro Energy', projectIds[6], isoTs(daysAgo(0)), isoTs(daysAgo(-1)), 'planificat', 'Recepție finală + factură.'],
  ['Ionel Cosma', 'București → Oradea', 'Prezentare ofertă Primărie', projectIds[8], isoTs(daysAgo(20)), isoTs(daysAgo(18)), 'finalizat', 'Așteptăm decizia comisiei.'],
].map((r) => [...r, adminId]);

inserted += seedIfEmpty('deplasari', deplasari,
  `INSERT INTO deplasari (person_name, destination, reason, project_id, departure_date, return_date, status, notes, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

// ── 10. PURCHASE ORDERS (against seeded suppliers) ────────────────────────
const supplierIds = allRows('SELECT id FROM suppliers ORDER BY id').map(r => r[0]);
if (supplierIds.length > 0) {
  const poRows = projectIds.slice(0, 6).map((pid, i) => [
    pick(supplierIds, i),
    pid,
    pick(['open', 'confirmed', 'delivered', 'closed'], i),
    `INT-PO-${2026}-${String(100 + i).padStart(3, '0')}`,
    isoTs(daysAgo(40 - i * 4)),
    adminId,
  ]);
  inserted += seedIfEmpty('purchase_orders', poRows,
    'INSERT INTO purchase_orders (supplier_id, project_id, status, internal_ref, ordered_at, created_by) VALUES (?, ?, ?, ?, ?, ?)');
}

// ── DONE — save + summary ─────────────────────────────────────────────────
const out = Buffer.from(db.export());
fs.writeFileSync(DB_PATH, out);
console.log('');
console.log(`[seed] Complete. Inserted ${inserted} rows. DB: ${(out.length / 1024 / 1024).toFixed(1)} MB`);
console.log(`[seed] Backup preserved at ${backupPath}`);
