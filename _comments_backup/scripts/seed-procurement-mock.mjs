/**
 * Seed mockup data for the Aprovizionare section so the user can verify the
 * UI end-to-end (suppliers, materials, purchase orders + lines, goods
 * receipts, RFQs + invitations).
 *
 * Run:  node scripts/seed-procurement-mock.mjs [db-path]
 *
 * Idempotent-ish: skips inserting suppliers/materials by their unique
 * code/name to avoid duplicating data on multiple runs.
 *
 * IMPORTANT: stop the server BEFORE running and start it after — sql.js holds
 * the DB in memory and would clobber our writes on its next 30s auto-save.
 */

import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dbPath = process.argv[2] || 'data/promix.db';
const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(dbPath));

// ─── helpers ────────────────────────────────────────────────────────────────

function exec(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  stmt.step();
  stmt.free();
}

function lastId() {
  const s = db.prepare('SELECT last_insert_rowid() AS id');
  s.step();
  const id = s.get()[0];
  s.free();
  return id;
}

function find(sql, params = []) {
  const s = db.prepare(sql);
  if (params.length) s.bind(params);
  const out = [];
  while (s.step()) out.push(s.getAsObject());
  s.free();
  return out;
}

function findOrInsert(table, uniqueWhere, uniqueParams, insertSql, insertParams) {
  const found = find(`SELECT id FROM ${table} WHERE ${uniqueWhere} LIMIT 1`, uniqueParams);
  if (found.length) return found[0].id;
  exec(insertSql, insertParams);
  return lastId();
}

const adminId = (find(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`)[0]?.id) ?? 1;
const projectId = (find(`SELECT id FROM projects ORDER BY id LIMIT 1`)[0]?.id) ?? null;
if (!projectId) {
  console.error('No project found in DB — create at least one project before seeding.');
  process.exit(1);
}

// ─── 1. SUPPLIERS ───────────────────────────────────────────────────────────

console.log('Seeding suppliers...');
const suppliers = [
  { name: 'Otelinox SRL', cui: 'RO12345678', city: 'Cluj', email: 'office@otelinox.ro', phone: '+40 264 444 100', cat: 'Oțel inox', products: 'Tabla inox 304/316, profil U, profil L', payment_terms: '30 zile' },
  { name: 'Mecanica Avantgarde', cui: 'RO87654321', city: 'București', email: 'sales@mecanica-av.ro', phone: '+40 21 555 200', cat: 'Subansamble', products: 'Reductoare, motoare, lagăre', payment_terms: '45 zile' },
  { name: 'ElectroPower Industries', cui: 'RO11223344', city: 'Brașov', email: 'office@electropower.ro', phone: '+40 268 333 100', cat: 'Electric', products: 'Cabluri, contactori, dulapuri electrice', payment_terms: 'avans 30%' },
  { name: 'HidroFlux SA', cui: 'RO99887766', city: 'Timișoara', email: 'office@hidroflux.ro', phone: '+40 256 444 500', cat: 'Hidraulic', products: 'Pompe, supape, racorduri', payment_terms: '60 zile' },
  { name: 'Pneumatic Solutions', cui: 'RO55443322', city: 'Ploiești', email: 'sales@pneumatic-sol.ro', phone: '+40 244 222 300', cat: 'Pneumatic', products: 'Compresoare, cilindri, electrovalve', payment_terms: '30 zile' },
  { name: 'Sigma Bolts', cui: 'RO66778899', city: 'Iași', email: 'office@sigmabolts.ro', phone: '+40 232 111 400', cat: 'Șuruburi', products: 'Șuruburi, șaibe, prezoane', payment_terms: 'OP la livrare' },
];
const supplierIds = [];
for (const s of suppliers) {
  const id = findOrInsert(
    'suppliers',
    'cui = ?',
    [s.cui],
    `INSERT INTO suppliers (name, cui, address, email, phone, category, products, payment_terms, active, contact_person)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [s.name, s.cui, s.city, s.email, s.phone, s.cat, s.products, s.payment_terms, 'Ion Popescu'],
  );
  supplierIds.push(id);
}
console.log(`  → ${supplierIds.length} suppliers (ids: ${supplierIds.join(', ')})`);

// ─── 2. MATERIALS ───────────────────────────────────────────────────────────

console.log('Seeding materials...');
const materials = [
  { code: 'INX-304-2', name: 'Tablă inox 304, 2mm', unit: 'kg', cost: 38, stock: 1200, min: 200, cat: 'Materie primă', sup: 'Otelinox SRL' },
  { code: 'INX-316-3', name: 'Tablă inox 316, 3mm', unit: 'kg', cost: 52, stock: 600, min: 100, cat: 'Materie primă', sup: 'Otelinox SRL' },
  { code: 'PROF-U-50', name: 'Profil U 50x30', unit: 'm', cost: 12, stock: 350, min: 50, cat: 'Profil', sup: 'Otelinox SRL' },
  { code: 'RED-M3', name: 'Reductor M3 1:50', unit: 'buc', cost: 1450, stock: 8, min: 2, cat: 'Subansamblu', sup: 'Mecanica Avantgarde' },
  { code: 'MOT-7.5KW', name: 'Motor 7.5kW 1500rpm', unit: 'buc', cost: 2200, stock: 5, min: 2, cat: 'Subansamblu', sup: 'Mecanica Avantgarde' },
  { code: 'CAB-3X4', name: 'Cablu 3x4mmp YSLY', unit: 'm', cost: 8.5, stock: 800, min: 150, cat: 'Electric', sup: 'ElectroPower Industries' },
  { code: 'CTC-100A', name: 'Contactor 100A 230V', unit: 'buc', cost: 320, stock: 12, min: 3, cat: 'Electric', sup: 'ElectroPower Industries' },
  { code: 'POMPA-50', name: 'Pompă hidraulică 50bar', unit: 'buc', cost: 4500, stock: 3, min: 1, cat: 'Hidraulic', sup: 'HidroFlux SA' },
  { code: 'CIL-100', name: 'Cilindru pneumatic 100mm', unit: 'buc', cost: 540, stock: 9, min: 3, cat: 'Pneumatic', sup: 'Pneumatic Solutions' },
  { code: 'EV-3-2', name: 'Electrovalvă 3/2 24V', unit: 'buc', cost: 280, stock: 18, min: 5, cat: 'Pneumatic', sup: 'Pneumatic Solutions' },
  { code: 'SUR-M10-50', name: 'Șurub M10x50 8.8 zinc', unit: 'buc', cost: 1.2, stock: 800, min: 200, cat: 'Șuruburi', sup: 'Sigma Bolts' },
  { code: 'SAI-M10', name: 'Șaibă plată M10', unit: 'buc', cost: 0.3, stock: 2400, min: 500, cat: 'Șuruburi', sup: 'Sigma Bolts' },
  { code: 'PREZ-M16', name: 'Prezon M16x60', unit: 'buc', cost: 4.5, stock: 80, min: 50, cat: 'Șuruburi', sup: 'Sigma Bolts' },
  // Some with low stock to trigger reorder hints
  { code: 'INX-EXP', name: 'Tablă inox expandată', unit: 'mp', cost: 165, stock: 5, min: 30, cat: 'Materie primă', sup: 'Otelinox SRL' },
  { code: 'COMP-22', name: 'Compresor 22kW', unit: 'buc', cost: 18500, stock: 0, min: 1, cat: 'Pneumatic', sup: 'Pneumatic Solutions' },
];
const materialIds = [];
for (const m of materials) {
  const id = findOrInsert(
    'materials',
    'code = ?',
    [m.code],
    `INSERT INTO materials (code, name, unit, unit_cost, stock, min_stock, category, supplier, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [m.code, m.name, m.unit, m.cost, m.stock, m.min, m.cat, m.sup, 'Depozit central'],
  );
  materialIds.push({ id, code: m.code });
}
console.log(`  → ${materialIds.length} materials`);

// ─── 3. PURCHASE ORDERS ────────────────────────────────────────────────────

console.log('Seeding purchase orders...');
const poRows = find(`SELECT id FROM purchase_orders LIMIT 1`);
if (poRows.length === 0) {
  const orders = [
    { sup: supplierIds[0], status: 'sent', ref: 'PO-2026-001', date: '2026-04-15', lines: [
      { code: 'INX-304-2', qty: 500, price: 36 },
      { code: 'INX-316-3', qty: 200, price: 50 },
      { code: 'PROF-U-50', qty: 100, price: 11 },
    ]},
    { sup: supplierIds[1], status: 'partially_received', ref: 'PO-2026-002', date: '2026-04-20', lines: [
      { code: 'RED-M3', qty: 4, price: 1400 },
      { code: 'MOT-7.5KW', qty: 2, price: 2150 },
    ]},
    { sup: supplierIds[2], status: 'received', ref: 'PO-2026-003', date: '2026-04-22', lines: [
      { code: 'CAB-3X4', qty: 500, price: 8 },
      { code: 'CTC-100A', qty: 6, price: 310 },
    ]},
    { sup: supplierIds[3], status: 'draft', ref: 'PO-2026-004', date: '2026-05-01', lines: [
      { code: 'POMPA-50', qty: 2, price: 4400 },
    ]},
    { sup: supplierIds[4], status: 'sent', ref: 'PO-2026-005', date: '2026-05-03', lines: [
      { code: 'CIL-100', qty: 5, price: 530 },
      { code: 'EV-3-2', qty: 10, price: 270 },
    ]},
  ];
  for (const o of orders) {
    exec(
      `INSERT INTO purchase_orders (supplier_id, project_id, status, internal_ref, ordered_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [o.sup, projectId, o.status, o.ref, o.date, adminId],
    );
    const poId = lastId();
    let lineNo = 1;
    for (const ln of o.lines) {
      const mat = materialIds.find(m => m.code === ln.code);
      if (!mat) continue;
      // For received/partially_received: simulate qty_received
      let qtyReceived = 0;
      if (o.status === 'received') qtyReceived = ln.qty;
      else if (o.status === 'partially_received') qtyReceived = Math.floor(ln.qty * 0.6);
      exec(
        `INSERT INTO purchase_order_lines (purchase_order_id, line_no, material_id, qty_ordered, qty_received, unit_price, currency)
         VALUES (?, ?, ?, ?, ?, ?, 'RON')`,
        [poId, lineNo, mat.id, ln.qty, qtyReceived, ln.price],
      );
      lineNo++;
    }
  }
  console.log(`  → ${orders.length} purchase orders with lines`);
} else {
  console.log('  → skipped (purchase_orders already populated)');
}

// ─── 4. GOODS RECEIPTS ─────────────────────────────────────────────────────

console.log('Seeding goods receipts (NIR)...');
const grRows = find(`SELECT id FROM goods_receipts LIMIT 1`);
if (grRows.length === 0) {
  // Create receipts for received/partially_received POs
  const pos = find(`
    SELECT po.id, po.supplier_id, po.internal_ref, po.status
    FROM purchase_orders po
    WHERE po.status IN ('received', 'partially_received')
  `);
  let nirCount = 0;
  for (const po of pos) {
    const receiptNumber = `NIR-2026-${String(po.id).padStart(3, '0')}`;
    exec(
      `INSERT INTO goods_receipts (receipt_number, purchase_order_id, supplier_id, project_id, received_date, received_by, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [receiptNumber, po.id, po.supplier_id, projectId, '2026-04-25', adminId,
       po.status === 'received' ? 'completed' : 'partial',
       po.status === 'received' ? 'Recepție completă conform PO' : 'Livrare parțială — diferența rămâne la urmărire'],
    );
    const rId = lastId();
    // Add receipt lines for each PO line
    const poLines = find(
      `SELECT pol.id, pol.material_id, pol.qty_ordered, pol.qty_received, m.name
       FROM purchase_order_lines pol LEFT JOIN materials m ON m.id = pol.material_id
       WHERE pol.purchase_order_id = ?`,
      [po.id],
    );
    for (const pl of poLines) {
      exec(
        `INSERT INTO goods_receipt_lines (receipt_id, po_line_id, material_id, description, qty_expected, qty_received, qty_match, label_ok, lot_number, has_issue)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [rId, pl.id, pl.material_id, pl.name,
         pl.qty_ordered, pl.qty_received,
         pl.qty_received >= pl.qty_ordered ? 1 : 0,
         1,
         `LOT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
         pl.qty_received < pl.qty_ordered ? 1 : 0],
      );
    }
    nirCount++;
  }
  console.log(`  → ${nirCount} goods receipts`);
} else {
  console.log('  → skipped (goods_receipts already populated)');
}

// ─── 5. RFQs ───────────────────────────────────────────────────────────────

console.log('Seeding RFQs...');
const rfqRows = find(`SELECT id FROM rfqs LIMIT 1`);
if (rfqRows.length === 0) {
  const rfqs = [
    { number: 'RFQ-2026-001', title: 'Profile inox stație Cluj', desc: '300m profil U + 200m profil L', deadline: '2026-05-15', status: 'sent', invites: [supplierIds[0]] },
    { number: 'RFQ-2026-002', title: 'Subansamble mecanice M60', desc: '4 reductoare + 2 motoare', deadline: '2026-05-20', status: 'sent', invites: [supplierIds[1]] },
    { number: 'RFQ-2026-003', title: 'Compresor 22kW pentru atelier', desc: 'Compresor industrial 22kW + accesorii', deadline: '2026-05-10', status: 'awarded', invites: [supplierIds[4]] },
    { number: 'RFQ-2026-004', title: 'Dulap electric stație Brașov', desc: 'Dulap 2000x800x400 + componente', deadline: '2026-06-01', status: 'draft', invites: [] },
  ];
  for (const r of rfqs) {
    exec(
      `INSERT INTO rfqs (rfq_number, project_id, title, description, deadline, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [r.number, projectId, r.title, r.desc, r.deadline, r.status, adminId],
    );
    const rfqId = lastId();
    for (const supId of r.invites) {
      const token = crypto.randomBytes(20).toString('hex');
      exec(
        `INSERT INTO rfq_invitations (rfq_id, supplier_id, public_token, status, sent_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [rfqId, supId, token, r.status === 'awarded' ? 'submitted' : 'sent'],
      );
    }
  }
  console.log(`  → ${rfqs.length} RFQs`);
} else {
  console.log('  → skipped (rfqs already populated)');
}

// ─── persist ────────────────────────────────────────────────────────────────

fs.writeFileSync(dbPath, Buffer.from(db.export()));
db.close();
console.log('\nDone. Restart the server to pick up the new data.');
