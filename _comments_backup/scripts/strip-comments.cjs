/*
 * strip-comments.cjs — remove ALL comments from the source (in-place).
 *
 * Uses @babel/parser to locate comments precisely (never confuses a comment
 * with a regex literal, string, template or JSX), then splices out ONLY those
 * character ranges from the original text. Formatting is otherwise preserved;
 * block-comment newlines are kept so line numbers don't shift.
 *
 * Files babel cannot parse are left intact (logged) — never corrupted.
 *
 * Run from the project root:  node scripts/strip-comments.cjs
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOTS = ['src', 'server', 'electron', 'scripts'];
const EXT = new Set(['.ts', '.tsx', '.js', '.cjs', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-server', 'dist-electron']);
const SELF = path.basename(__filename);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), out);
    } else if (EXT.has(path.extname(e.name)) && e.name !== SELF) {
      out.push(path.join(dir, e.name));
    }
  }
}

function strip(code, isTsx) {
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', isTsx && 'jsx', 'decorators-legacy'].filter(Boolean),
      ranges: true,
    });
  } catch (e) {
    return { skipped: true, reason: String(e.message).split('\n')[0] };
  }
  const comments = ast.comments || [];
  if (!comments.length) return { code, removed: 0 };
  let out = code;
  for (const c of comments.slice().sort((a, b) => b.start - a.start)) {
    const seg = out.slice(c.start, c.end);
    const nl = (seg.match(/\n/g) || []).length;
    out = out.slice(0, c.start) + '\n'.repeat(nl) + out.slice(c.end);
  }
  return { code: out, removed: comments.length };
}

const root = process.cwd();
const files = [];
for (const r of ROOTS) {
  const d = path.join(root, r);
  if (fs.existsSync(d)) walk(d, files);
}

let changed = 0;
let totalComments = 0;
const skipped = [];
for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const res = strip(code, f.endsWith('x'));
  if (res.skipped) { skipped.push(`${path.relative(root, f)}  (${res.reason})`); continue; }
  if (res.removed > 0 && res.code !== code) {
    fs.writeFileSync(f, res.code);
    changed++;
    totalComments += res.removed;
  }
}

console.log(`[strip] scanned ${files.length} files · changed ${changed} · comments removed ${totalComments} · skipped(parse) ${skipped.length}`);
for (const s of skipped) console.log('  SKIPPED (left intact): ' + s);
