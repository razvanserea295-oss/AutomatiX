/**
 * Map a raw sql.js constraint error to a friendly HTTP status + Romanian
 * message. Returns null when the error isn't a recognised DB constraint (the
 * HTTP layer then falls back to the generic 400/500 handling).
 *
 * sql.js surfaces these as plain `Error` messages, e.g.
 *   "UNIQUE constraint failed: users.username"
 *   "FOREIGN KEY constraint failed"
 *   "NOT NULL constraint failed: quotations.title"
 *   "CHECK constraint failed: unit_price >= 0"
 *
 * Kept dependency-free and side-effect-free so it can be unit-tested without
 * booting the server (server/index.ts has heavy top-level side effects).
 */
export function mapSqliteConstraintError(err: unknown): { code: number; message: string } | null {
  const raw = err instanceof Error ? err.message : (typeof err === 'string' ? err : '');
  if (!raw) return null;
  const low = raw.toLowerCase();
  if (!low.includes('constraint failed')) return null;

  // Extract a clean field list from a "...failed: tbl.col[, tbl.col]" tail.
  const fieldsAfterColon = (): string => {
    const m = raw.match(/constraint failed:\s*(.+)$/i);
    if (!m) return '';
    return m[1]
      .split(',')
      .map(s => s.trim().split('.').pop() || s.trim())
      .filter(Boolean)
      .join(', ');
  };

  if (low.includes('unique constraint failed')) {
    const f = fieldsAfterColon();
    return { code: 409, message: f ? `Înregistrarea există deja (${f} duplicat).` : 'Înregistrarea există deja.' };
  }
  if (low.includes('foreign key constraint failed')) {
    // sql.js doesn't name the referenced table, so keep it generic but useful.
    return { code: 422, message: 'Operația nu este permisă: înregistrarea este folosită de altă înregistrare.' };
  }
  if (low.includes('not null constraint failed')) {
    const f = fieldsAfterColon();
    return { code: 422, message: f ? `Câmp obligatoriu lipsește: ${f}.` : 'Câmp obligatoriu lipsește.' };
  }
  if (low.includes('check constraint failed')) {
    const f = fieldsAfterColon();
    return { code: 422, message: f ? `Valoare invalidă (regula: ${f}).` : 'Valoare invalidă.' };
  }
  return null;
}
