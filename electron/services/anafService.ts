













import { CommandError } from '../middleware/errors';

export interface AnafCompanyInfo {
  cui: string;
  denumire: string;
  adresa: string;
  judet: string;
  oras: string;
  cod_postal: string;
  reg_com: string;
  telefon: string;
  fax: string;
  email: string;
  is_tva_payer: boolean;
  status_inregistrare_tva: string;
  data_inregistrare: string | null;
  raw: Record<string, any>;
}

const ANAF_URL = 'https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva';

function normalizeCui(cui: string): string {
  return cui.replace(/^RO/i, '').trim();
}

export class AnafService {
  static async lookup(cuiRaw: string): Promise<AnafCompanyInfo> {
    const cui = normalizeCui(cuiRaw);
    if (!/^\d{2,10}$/.test(cui)) {
      throw CommandError.badRequest('CUI invalid (trebuie 2-10 cifre)');
    }

    const today = new Date().toISOString().slice(0, 10);
    const body = JSON.stringify([{ cui: Number(cui), data: today }]);

    let res: Response;
    try {
      res = await fetch(ANAF_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch (err) {
      
      
      
      const msg = err instanceof Error ? err.message : 'Eroare rețea';
      throw CommandError.badRequest(`ANAF inaccesibil: ${msg}`);
    }

    if (!res.ok) {
      throw CommandError.badRequest(`ANAF a răspuns ${res.status} — încercați mai târziu`);
    }

    const data: any = await res.json();
    
    
    
    if (data.cod && data.cod !== 200) {
      throw CommandError.badRequest(data.message || 'CUI negăsit la ANAF');
    }
    if (Array.isArray(data.notFound) && data.notFound.length > 0 && (!data.found || data.found.length === 0)) {
      throw CommandError.notFound('CUI negăsit la ANAF');
    }
    if (!Array.isArray(data.found) || data.found.length === 0) {
      throw CommandError.notFound('CUI negăsit la ANAF');
    }

    const c = data.found[0];
    const dateGen = c.date_generale || {};
    const adresaSocial = c.adresa_sediu_social || {};
    const inregTva = c.inregistrare_scop_Tva || {};

    return {
      cui: String(dateGen.cui || cui),
      denumire: dateGen.denumire || '',
      adresa: [adresaSocial.sdenumire_Strada, adresaSocial.snumar_Strada].filter(Boolean).join(' '),
      judet: adresaSocial.sdenumire_Judet || '',
      oras: adresaSocial.sdenumire_Localitate || '',
      cod_postal: adresaSocial.scod_Postal || '',
      reg_com: dateGen.nrRegCom || '',
      telefon: dateGen.telefon || '',
      fax: dateGen.fax || '',
      email: '',
      is_tva_payer: inregTva.scpTVA === true,
      status_inregistrare_tva: inregTva.statusInregistrare || '',
      data_inregistrare: dateGen.data_inregistrare || null,
      raw: c,
    };
  }
}
