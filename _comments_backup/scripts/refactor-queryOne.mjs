import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICES_DIR = path.resolve(__dirname, '..', 'electron', 'services');

const FILES = [
  'productionService.ts', 'handoffService.ts', 'pieceService.ts',
  'contractService.ts', 'procurementService.ts', 'warehouseService.ts',
  'documentService.ts', 'checklistService.ts', 'maintenanceService.ts',
  'stationService.ts', 'alertService.ts', 'deplasariService.ts',
  'userService.ts', 'workspaceService.ts', 'productionDocsService.ts',
  'libraryService.ts', 'engineeringService.ts',
];

const IMPORT_LINE = "import { queryOne } from '../db/sqlHelpers';";
const FN_START = 'function queryOne<T>(db: Database';

let updated = 0;
let totalRemovedLines = 0;

for (const f of FILES) {
  const fp = path.join(SERVICES_DIR, f);
  const lines = fs.readFileSync(fp, 'utf8').split('\n');

  // Locate the queryOne function by its signature line.
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(FN_START)) { start = i; break; }
  }
  if (start < 0) {
    console.error(`SKIP (no queryOne def): ${f}`);
    continue;
  }

  // Walk forward, tracking brace depth, until we close the function.
  let depth = 0;
  let end = -1;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end >= 0) break;
  }
  if (end < 0) {
    console.error(`SKIP (unbalanced braces): ${f}`);
    continue;
  }

  // Also drop the empty line right after, if any, to avoid extra blank lines.
  let removeUpTo = end;
  if (lines[end + 1] === '') removeUpTo = end + 1;
  // And the empty line right before, if there was one, for symmetry.
  let removeFrom = start;
  if (start > 0 && lines[start - 1] === '') removeFrom = start - 1;

  const removedCount = removeUpTo - removeFrom + 1;
  lines.splice(removeFrom, removedCount);
  totalRemovedLines += removedCount;

  // Insert import after the last existing import line.
  if (!lines.some(l => l.includes(IMPORT_LINE))) {
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import .+ from /.test(lines[i])) lastImportIdx = i;
      else if (lastImportIdx >= 0 && lines[i].trim() === '') break;
    }
    if (lastImportIdx < 0) {
      console.error(`SKIP (no import block): ${f}`);
      continue;
    }
    lines.splice(lastImportIdx + 1, 0, IMPORT_LINE);
  }

  fs.writeFileSync(fp, lines.join('\n'));
  updated++;
  console.log(`OK: ${f}  (-${removedCount} lines)`);
}

console.log(`\nFiles updated: ${updated}/${FILES.length}`);
console.log(`Total lines removed: ${totalRemovedLines}`);
