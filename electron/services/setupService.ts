









import type { Database } from 'sql.js';
import { queryOne } from '../db/sqlHelpers';
import { capStr, validateNumber } from '../middleware/validate';
import type { UserWithRole } from './authService';

const SETUP_FLAG_KEY = 'initial_setup_completed';

export interface CompanyProfile {
  company_name: string;
  cui: string;
  reg_com: string;
  address: string;
  city: string;
  county: string;
  phone: string;
  email: string;
  bank_name: string;
  iban: string;
}

export interface BrandingPayload {
  logo_base64: string;
  seal_base64: string;
}

export interface FiscalPayload {
  tva_rate: number;
  default_currency: string;
  invoice_series: string;
  invoice_next_number: number;
  offer_series: string;
  offer_next_number: number;
  aviz_series: string;
  aviz_next_number: number;
  number_format: string;
}

export interface SetupState {
  completed: boolean;
  settings: Record<string, unknown>;
}



export function getAppSetting(db: Database, key: string): string | null {
  return queryOne(db, 'SELECT value FROM app_settings WHERE key = ?', [key], r => r.value as string | null);
}

export function setAppSetting(db: Database, key: string, value: string): void {
  db.run(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value],
  );
}



export const SetupService = {
  
  isCompleted(db: Database): boolean {
    return getAppSetting(db, SETUP_FLAG_KEY) === '1';
  },

  
  getState(db: Database): SetupState {
    const settings = queryOne(
      db,
      `SELECT company_name, cui, reg_com, address, city, county, phone, email,
              bank_name, iban, tva_rate, default_currency,
              logo_base64, seal_base64,
              invoice_series, invoice_next_number, offer_series, offer_next_number,
              aviz_series, aviz_next_number, number_format
       FROM company_settings WHERE id = 1`,
      [],
      r => r as Record<string, unknown>,
    ) ?? {};
    return { completed: SetupService.isCompleted(db), settings };
  },

  
  saveCompanyProfile(db: Database, user: UserWithRole, req: CompanyProfile): SetupState {
    db.run(
      `UPDATE company_settings SET
         company_name = ?, cui = ?, reg_com = ?, address = ?, city = ?, county = ?,
         phone = ?, email = ?, bank_name = ?, iban = ?, updated_by = ?,
         updated_at = datetime('now')
       WHERE id = 1`,
      [
        capStr(req.company_name, 200, 'Nume firmă', { required: true }),
        capStr(req.cui, 40, 'CUI') ?? '',
        capStr(req.reg_com, 40, 'Reg. Com.') ?? '',
        capStr(req.address, 300, 'Sediu') ?? '',
        capStr(req.city, 100, 'Localitate') ?? '',
        capStr(req.county, 100, 'Județ') ?? '',
        capStr(req.phone, 60, 'Telefon') ?? '',
        capStr(req.email, 120, 'Email') ?? '',
        capStr(req.bank_name, 120, 'Bancă') ?? '',
        capStr(req.iban, 40, 'IBAN') ?? '',
        user.id,
      ],
    );
    return SetupService.getState(db);
  },

  
  saveBranding(db: Database, user: UserWithRole, req: BrandingPayload): SetupState {
    db.run(
      `UPDATE company_settings SET logo_base64 = ?, seal_base64 = ?, updated_by = ?,
         updated_at = datetime('now') WHERE id = 1`,
      [
        capStr(req.logo_base64, 3_000_000, 'Logo', { trim: false }) ?? '',
        capStr(req.seal_base64, 3_000_000, 'Sigiliu', { trim: false }) ?? '',
        user.id,
      ],
    );
    return SetupService.getState(db);
  },

  
  saveFiscalSettings(db: Database, user: UserWithRole, req: FiscalPayload): SetupState {
    
    
    
    let tva = validateNumber(req.tva_rate, 'Cotă TVA', { min: 0, max: 100 }) ?? 0.21;
    if (tva > 1) tva = tva / 100;

    db.run(
      `UPDATE company_settings SET
         tva_rate = ?, default_currency = ?,
         invoice_series = ?, invoice_next_number = ?,
         offer_series = ?, offer_next_number = ?,
         aviz_series = ?, aviz_next_number = ?,
         number_format = ?, updated_by = ?, updated_at = datetime('now')
       WHERE id = 1`,
      [
        tva,
        capStr(req.default_currency, 8, 'Monedă') ?? 'RON',
        capStr(req.invoice_series, 16, 'Serie factură') ?? 'FAC',
        Math.max(1, Math.trunc(validateNumber(req.invoice_next_number, 'Următorul nr. factură', { min: 1 }) ?? 1)),
        capStr(req.offer_series, 16, 'Serie ofertă') ?? 'OFR',
        Math.max(1, Math.trunc(validateNumber(req.offer_next_number, 'Următorul nr. ofertă', { min: 1 }) ?? 1)),
        capStr(req.aviz_series, 16, 'Serie aviz') ?? 'AVZ',
        Math.max(1, Math.trunc(validateNumber(req.aviz_next_number, 'Următorul nr. aviz', { min: 1 }) ?? 1)),
        capStr(req.number_format, 40, 'Format numerotare') ?? '{serie}-{nr}',
        user.id,
      ],
    );
    return SetupService.getState(db);
  },

  
  completeInitialSetup(db: Database, _user: UserWithRole): SetupState {
    setAppSetting(db, SETUP_FLAG_KEY, '1');
    return SetupService.getState(db);
  },

  
  reopenInitialSetup(db: Database, _user: UserWithRole): SetupState {
    setAppSetting(db, SETUP_FLAG_KEY, '0');
    return SetupService.getState(db);
  },
};
