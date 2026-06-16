














export function maskPhone(raw: string): string {
  if (!raw) return '';
  let s = raw.replace(/[^\d+]/g, '');
  
  if (s.includes('+')) s = '+' + s.replace(/\+/g, '').replace(/^/, '');
  
  if (/^07\d/.test(s)) s = '+4' + s;
  
  if (/^40\d/.test(s)) s = '+' + s;

  
  const plus = s.startsWith('+') ? '+' : '';
  const digits = s.replace(/\D/g, '');
  if (!digits) return plus;
  
  if (plus && digits.startsWith('40')) {
    const cc = '40';
    const rest = digits.slice(2);
    const a = rest.slice(0, 3);
    const b = rest.slice(3, 6);
    const c = rest.slice(6, 9);
    return `+${cc}${a ? ' ' + a : ''}${b ? ' ' + b : ''}${c ? ' ' + c : ''}`.trim();
  }
  
  return (plus + digits.match(/.{1,3}/g)?.join(' ')).trim();
}

export function validatePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 9) return 'Telefon prea scurt';
  if (digits.length > 15) return 'Telefon prea lung';
  return null;
}







export function maskCui(raw: string): string {
  if (!raw) return '';
  let s = raw.toUpperCase().replace(/[\s/\\.\-]/g, '');
  
  
  if (/^\d{2,10}$/.test(s)) s = 'RO' + s;
  
  return s.slice(0, 12);
}





export function validateCui(raw: string): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/\s/g, '');
  const m = s.match(/^(RO)?(\d{2,10})$/);
  if (!m) return 'CUI invalid';
  const digits = m[2];
  if (!m[1]) return null; 
  
  const KEY = '753217532';
  const body = digits.slice(0, -1);
  const expected = Number(digits.slice(-1));
  if (body.length < 1) return 'CUI invalid';
  const padded = body.padStart(KEY.length, '0');
  let sum = 0;
  for (let i = 0; i < padded.length; i++) sum += Number(padded[i]) * Number(KEY[i]);
  const check = (sum * 10) % 11 % 10;
  if (check !== expected) return 'CUI invalid (checksum)';
  return null;
}




export function maskIban(raw: string): string {
  if (!raw) return '';
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 34);
  return compact.match(/.{1,4}/g)?.join(' ') ?? compact;
}


export function validateIban(raw: string): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return 'IBAN invalid';
  
  if (s.startsWith('RO') && s.length !== 24) return 'IBAN RO trebuie să aibă 24 caractere';
  
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  
  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + Number(ch)) % 97;
  }
  if (remainder !== 1) return 'IBAN invalid (checksum)';
  return null;
}
