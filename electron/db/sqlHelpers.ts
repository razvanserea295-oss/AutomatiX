import type { Database } from 'sql.js';

export function queryOne<T>(
  db: Database,
  sql: string,
  params: any[],
  mapper: (row: any) => T,
): T | null {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let result: T | null = null;
  if (stmt.step()) result = mapper(stmt.getAsObject());
  stmt.free();
  return result;
}

export function queryAll<T>(
  db: Database,
  sql: string,
  params: any[],
  mapper: (row: any) => T,
): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(mapper(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}