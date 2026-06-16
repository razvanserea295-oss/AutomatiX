/**
 * Money helpers.
 *
 * JavaScript doubles can't represent decimal cents exactly
 * (`0.1 + 0.2 === 0.30000000000000004`), so:
 *   - every monetary VALUE we compute/store snaps to 2 decimals via `roundMoney`;
 *   - sums accumulate in integer cents via `sumMoney` (zero float drift);
 *   - amounts in DIFFERENT currencies are NEVER added into one scalar — use
 *     `groupAmountsByCurrency` to keep EUR and RON (etc.) separate.
 *
 * Pure functions, no deps — safe to import from any service or the server.
 */

/** Round a monetary amount to 2 decimals. Non-finite → 0. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Nudge by a sign-aware epsilon so values that are a hair under .x05 from a
  // prior float op (e.g. 1.0049999999) still round the intuitive way.
  const sign = value >= 0 ? 1 : -1;
  return Math.round((value + sign * Number.EPSILON) * 100) / 100;
}

/** Sum amounts in the SAME currency, accumulating in integer cents (no drift). */
export function sumMoney(amounts: Array<number | null | undefined>): number {
  let cents = 0;
  for (const a of amounts) {
    if (a == null || !Number.isFinite(a)) continue;
    cents += Math.round(a * 100);
  }
  return cents / 100;
}

/**
 * Group amounts by currency into a `{ [CURRENCY]: total }` map (each total
 * rounded, accumulated in cents). Use this instead of a single `reduce(+)` over
 * rows that carry a `currency` column — adding EUR and RON as one number is a
 * reporting bug.
 */
export function groupAmountsByCurrency<T>(
  rows: T[],
  amountOf: (r: T) => number | null | undefined,
  currencyOf: (r: T) => string | null | undefined,
  defaultCurrency = 'RON',
): Record<string, number> {
  const cents: Record<string, number> = {};
  for (const r of rows) {
    const cur = (currencyOf(r) || defaultCurrency).toUpperCase();
    const a = amountOf(r);
    if (a == null || !Number.isFinite(a)) continue;
    cents[cur] = (cents[cur] || 0) + Math.round(a * 100);
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(cents)) out[k] = v / 100;
  return out;
}
