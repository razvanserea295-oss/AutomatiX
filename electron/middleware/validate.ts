

























import { CommandError } from './errors';










export function capStr(
  v: unknown,
  max: number,
  name: string,
  options: { required?: boolean; trim?: boolean } = {},
): string | null {
  const { required = false, trim = true } = options;
  if (v == null) {
    if (required) throw CommandError.badRequest(`Câmpul "${name}" este obligatoriu`);
    return null;
  }
  if (typeof v !== 'string') {
    
    
    throw CommandError.badRequest(`Câmpul "${name}" trebuie să fie text`);
  }
  const s = trim ? v.trim() : v;
  if (s === '') {
    if (required) throw CommandError.badRequest(`Câmpul "${name}" este obligatoriu`);
    return null;
  }
  if (s.length > max) {
    throw CommandError.badRequest(
      `Câmpul "${name}" depășește limita de ${max} caractere (${s.length} primite)`,
    );
  }
  return s;
}





export function validateId(v: unknown, name: string, required = false): number | null {
  if (v == null || v === '') {
    if (required) throw CommandError.badRequest(`Câmpul "${name}" este obligatoriu`);
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 2147483647) {
    throw CommandError.badRequest(`Câmpul "${name}" trebuie să fie un id valid`);
  }
  return n;
}






export function validateNumber(
  v: unknown,
  name: string,
  options: { min?: number; max?: number; required?: boolean; allowNegative?: boolean } = {},
): number | null {
  const { min, max = 1e12, required = false, allowNegative = false } = options;
  if (v == null || v === '') {
    if (required) throw CommandError.badRequest(`Câmpul "${name}" este obligatoriu`);
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw CommandError.badRequest(`Câmpul "${name}" trebuie să fie un număr`);
  }
  const lower = min != null ? min : (allowNegative ? -max : 0);
  if (n < lower || n > max) {
    throw CommandError.badRequest(`Câmpul "${name}" trebuie să fie între ${lower} și ${max}`);
  }
  return n;
}


export function validateEnum<T extends string>(
  v: unknown,
  allowed: readonly T[],
  defaultValue: T | null,
  name: string,
): T | null {
  if (v == null || v === '') return defaultValue;
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) {
    return v as T;
  }
  if (defaultValue == null) {
    throw CommandError.badRequest(
      `Câmpul "${name}" are o valoare invalidă (acceptate: ${allowed.join(', ')})`,
    );
  }
  return defaultValue;
}





export function validateDate(v: unknown, name: string, required = false): string | null {
  const s = capStr(v, 40, name, { required });
  if (s == null) return null;
  
  
  if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?([.,]\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(s)) {
    throw CommandError.badRequest(`Câmpul "${name}" trebuie să fie o dată validă (YYYY-MM-DD)`);
  }
  return s;
}





export function validateEmail(v: unknown, name: string, required = false): string | null {
  const s = capStr(v, 254, name, { required }); 
  if (s == null) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    throw CommandError.badRequest(`Câmpul "${name}" nu este o adresă de email validă`);
  }
  return s;
}







export function capBlob(v: unknown, maxChars: number, name: string, required = false): string | null {
  const s = capStr(v, maxChars, name, { required, trim: false });
  return s;
}






export function capArray<T, R>(
  v: unknown,
  maxLen: number,
  name: string,
  inner: (item: unknown, idx: number) => R,
): R[] {
  if (v == null) return [];
  if (!Array.isArray(v)) {
    throw CommandError.badRequest(`Câmpul "${name}" trebuie să fie o listă`);
  }
  if (v.length > maxLen) {
    throw CommandError.badRequest(
      `Lista "${name}" depășește limita de ${maxLen} elemente (${v.length} primite)`,
    );
  }
  return v.map(inner);
}
