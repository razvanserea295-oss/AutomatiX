/* eslint-disable */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const ELECTRON = path.join(ROOT, 'electron');
const SERVER = path.join(ROOT, 'server');

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'dist-server') continue;
      walk(p, exts, out);
    } else if (exts.some(x => e.name.endsWith(x))) {
      out.push(p);
    }
  }
  return out;
}

function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}


const registered = new Map(); 
const registerFnContainsRegister = new Map(); 
const fileOfRegisterFn = new Map(); 
const dynamicRegister = []; 

const backendFiles = [...walk(ELECTRON, ['.ts']), ...walk(SERVER, ['.ts'])];

const REG_RE = /\bipcRegister\s*(?:<[^(]*>)?\s*\(\s*(['"`])([a-zA-Z0-9_.]+)\1/g;
const REG_DYN_RE = /\bipcRegister\s*(?:<[^(]*>)?\s*\(\s*([^'"`\s)])/g; 
const FN_RE = /export\s+function\s+(register[A-Za-z0-9_]+)\s*\(/g;

for (const f of backendFiles) {
  const c = fs.readFileSync(f, 'utf8');
  
  const fnSpans = []; 
  let m;
  FN_RE.lastIndex = 0;
  while ((m = FN_RE.exec(c))) { fnSpans.push({ name: m[1], start: m.index }); fileOfRegisterFn.set(m[1], rel(f)); }
  REG_RE.lastIndex = 0;
  while ((m = REG_RE.exec(c))) {
    const name = m[2];
    const line = lineOf(c, m.index);
    if (!registered.has(name)) registered.set(name, []);
    registered.get(name).push({ file: rel(f), line });
    
    let owner = null;
    for (const s of fnSpans) { if (s.start < m.index) owner = s.name; }
    if (owner) {
      if (!registerFnContainsRegister.has(owner)) registerFnContainsRegister.set(owner, new Set());
      registerFnContainsRegister.get(owner).add(name);
    }
  }
  
  REG_DYN_RE.lastIndex = 0;
  while ((m = REG_DYN_RE.exec(c))) {
    const ch = m[1];
    if (ch === '<') continue; 
    const line = lineOf(c, m.index);
    const snippet = c.slice(m.index, m.index + 60).replace(/\n/g, ' ');
    dynamicRegister.push({ file: rel(f), line, snippet });
  }
}


const handlerFile = path.join(ELECTRON, 'ipc', 'handler.ts');
const handlerSrc = fs.readFileSync(handlerFile, 'utf8');

const bodyMatch = handlerSrc.match(/export function registerAllHandlers\(\)[\s\S]*$/);
const handlerBody = bodyMatch ? bodyMatch[0] : handlerSrc;
const invokedFns = new Set();
const CALL_RE = /\b(register[A-Za-z0-9_]+)\s*\(\s*\)/g;
let cm;
while ((cm = CALL_RE.exec(handlerBody))) invokedFns.add(cm[1]);


const notInvokedCommands = new Map(); 
for (const [fn, names] of registerFnContainsRegister) {
  if (fn === 'registerAllHandlers') continue;
  if (!invokedFns.has(fn)) {
    for (const n of names) notInvokedCommands.set(n, { ownerFn: fn, file: fileOfRegisterFn.get(fn) });
  }
}

const registeredViaInvoked = new Set();
for (const [fn, names] of registerFnContainsRegister) {
  if (fn === 'registerAllHandlers' || invokedFns.has(fn)) {
    for (const n of names) registeredViaInvoked.add(n);
  }
}


const moduleScopeRegistered = new Set();
for (const [name, locs] of registered) {
  
  let attributed = false;
  for (const names of registerFnContainsRegister.values()) if (names.has(name)) { attributed = true; break; }
  if (!attributed) moduleScopeRegistered.add(name);
}
const runtimeRegistered = new Set([...registeredViaInvoked, ...moduleScopeRegistered]);


const frontFiles = walk(SRC, ['.ts', '.tsx']);
const called = new Map(); 
const dynamicCalls = []; 
const CALL_LIT_RE = /\bapiCommand\s*(?:<[^(]*>)?\s*\(\s*(['"`])([a-zA-Z0-9_.]+)\1/g;
const CALL_DYN_RE = /\bapiCommand\s*(?:<[^(]*>)?\s*\(\s*([^'"`\s)<])/g;

const INVOKE_RE = /\b(?:window\.)?electron\.invoke\s*\(\s*(['"`])([a-zA-Z0-9_.]+)\1/g;
const FETCH_RE = /\/api\/cmd\/([a-zA-Z0-9_.]+)/g;
const calledVia = new Map(); 
function addCalled(name, file, line, via) {
  if (!called.has(name)) called.set(name, []);
  called.get(name).push({ file: rel(file), line, via });
  if (!calledVia.has(name)) calledVia.set(name, new Set());
  calledVia.get(name).add(via);
}

for (const f of frontFiles) {
  const c = fs.readFileSync(f, 'utf8');
  let m;
  CALL_LIT_RE.lastIndex = 0;
  while ((m = CALL_LIT_RE.exec(c))) addCalled(m[2], f, lineOf(c, m.index), 'apiCommand');
  INVOKE_RE.lastIndex = 0;
  while ((m = INVOKE_RE.exec(c))) addCalled(m[2], f, lineOf(c, m.index), 'electron.invoke');
  FETCH_RE.lastIndex = 0;
  while ((m = FETCH_RE.exec(c))) addCalled(m[1], f, lineOf(c, m.index), 'fetch');
  CALL_DYN_RE.lastIndex = 0;
  while ((m = CALL_DYN_RE.exec(c))) {
    const line = lineOf(c, m.index);
    const snippet = c.slice(m.index, m.index + 70).replace(/\n/g, ' ');
    dynamicCalls.push({ file: rel(f), line, snippet });
  }
}


const calledNames = [...called.keys()].sort();
const registeredNames = [...registered.keys()].sort();

const via = (n) => [...(calledVia.get(n) || [])].sort().join('+');
const httpCalled = (n) => { const s = calledVia.get(n); return s && (s.has('apiCommand') || s.has('fetch')); };

const missing = calledNames.filter(n => !registered.has(n)); 
const notInvokedButCalled = calledNames.filter(n => registered.has(n) && !runtimeRegistered.has(n)); 
const dead = registeredNames.filter(n => !called.has(n)); 

const out = {
  summary: {
    totalCalledNames: calledNames.length,
    totalRegisteredNames: registeredNames.length,
    missing: missing.length,
    notInvokedButCalled: notInvokedButCalled.length,
    dead: dead.length,
    dynamicCalls: dynamicCalls.length,
    dynamicRegister: dynamicRegister.length,
  },
  missing: missing.map(n => ({ name: n, via: via(n), calledAt: called.get(n) })),
  notInvokedButCalled: notInvokedButCalled.map(n => ({ name: n, via: via(n), calledAt: called.get(n), registeredAt: registered.get(n), owner: notInvokedCommands.get(n) })),
  dead: dead.map(n => ({ name: n, registeredAt: registered.get(n) })),
  deadNames: dead,
  dynamicCalls,
  dynamicRegister,
  invokedFnsCount: invokedFns.size,
  registerFnsDefined: [...fileOfRegisterFn.keys()].length,
  registerFnsNotInvoked: [...registerFnContainsRegister.keys()].filter(fn => fn !== 'registerAllHandlers' && !invokedFns.has(fn)),
};

fs.writeFileSync(path.join(ROOT, 'scripts', 'ipc-audit-result.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.summary, null, 2));
console.log('MISSING:', missing.join(', ') || '(none)');
console.log('NOT-INVOKED-BUT-CALLED:', notInvokedButCalled.join(', ') || '(none)');
console.log('REGISTER-FNS-NOT-INVOKED:', out.registerFnsNotInvoked.join(', ') || '(none)');
