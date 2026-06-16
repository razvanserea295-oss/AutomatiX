










export type StatusTone =
  | 'success'   
  | 'warning'   
  | 'danger'    
  | 'info'      
  | 'progress'  
  | 'special'   
  | 'accent'    
  | 'neutral';  

export interface StatusToken {
  tone: StatusTone;
  label: string;
}

const NEUTRAL: StatusToken = { tone: 'neutral', label: '—' };

const norm = (v: string | null | undefined): string =>
  (v ?? '').toString().trim().toLowerCase()
    
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');



const PROJECT: Record<string, StatusToken> = {
  'oferta':       { tone: 'info',     label: 'Ofertă' },
  'aprobat':      { tone: 'success',  label: 'Aprobat' },
  'in productie': { tone: 'warning',  label: 'În producție' },
  'livrare':      { tone: 'progress', label: 'Livrare' },
  'finalizat':    { tone: 'success',  label: 'Finalizat' },
  'blocat':       { tone: 'danger',   label: 'Blocat' },
  'anulat':       { tone: 'neutral',  label: 'Anulat' },
};

export function projectStatus(value: string | null | undefined): StatusToken {
  return PROJECT[norm(value)] ?? { tone: 'neutral', label: value || '—' };
}



const INVOICE: Record<string, StatusToken> = {
  draft:     { tone: 'neutral',  label: 'Ciornă' },
  sent:      { tone: 'accent',   label: 'Trimisă' },
  paid:      { tone: 'success',  label: 'Plătită' },
  partial:   { tone: 'warning',  label: 'Parțial' },
  overdue:   { tone: 'danger',   label: 'Restantă' },
  cancelled: { tone: 'neutral',  label: 'Anulată' },
};

export function invoiceStatus(value: string | null | undefined): StatusToken {
  return INVOICE[norm(value)] ?? { tone: 'neutral', label: value || '—' };
}



const CONTRACT: Record<string, StatusToken> = {
  
  
  
  
  draft:   { tone: 'neutral', label: 'Ciornă' },
  ciorna:  { tone: 'neutral', label: 'Ciornă' },
  active:  { tone: 'success', label: 'Activ' },
  amended: { tone: 'warning', label: 'Amendat' },
  closed:  { tone: 'danger',  label: 'Închis' },
};

export function contractStatus(value: string | null | undefined): StatusToken {
  return CONTRACT[norm(value)] ?? { tone: 'neutral', label: value || '—' };
}



const DEPLASARE: Record<string, StatusToken> = {
  viitoare:     { tone: 'warning',  label: 'Viitoare' },
  in_deplasare: { tone: 'info',     label: 'În deplasare' },
  intors:       { tone: 'warning',  label: 'Întors (costuri lipsă)' },
  finalizat:    { tone: 'success',  label: 'Finalizat' },
  anulat:       { tone: 'neutral',  label: 'Anulat' },
};

export function deplasareStatus(value: string | null | undefined): StatusToken {
  const k = norm(value).replace(/\s+/g, '_');
  return DEPLASARE[k] ?? { tone: 'neutral', label: value || '—' };
}



const LEAD: Record<string, StatusToken> = {
  fara_contact:   { tone: 'neutral', label: 'Fără contact' },
  decizie_client: { tone: 'warning', label: 'Decizie client' },
  decizie_noastra:{ tone: 'warning', label: 'Decizie noastră' },
  in_negocieri:   { tone: 'info',    label: 'În negocieri' },
  convertit:      { tone: 'success', label: 'Convertit' },
};

export function leadStatus(value: string | null | undefined): StatusToken {
  const k = norm(value).replace(/\s+/g, '_');
  return LEAD[k] ?? { tone: 'neutral', label: value || '—' };
}


const LEAD_PROJECT: Record<string, StatusToken> = {
  'oferta':       { tone: 'neutral',  label: 'Proiectare neîncepută' },
  'aprobat':      { tone: 'info',     label: 'În proiectare' },
  'in productie': { tone: 'warning',  label: 'În execuție' },
  'livrare':      { tone: 'special',  label: 'În montaj' },
  'finalizat':    { tone: 'success',  label: 'Proiect finalizat' },
};

export function leadProjectStatus(value: string | null | undefined): StatusToken {
  return LEAD_PROJECT[norm(value)] ?? { tone: 'neutral', label: value || '—' };
}



const PIECE: Record<string, StatusToken> = {
  fabricat:     { tone: 'success',  label: 'Fabricat' },
  livrat:       { tone: 'success',  label: 'Livrat' },
  testat:       { tone: 'success',  label: 'Testat' },
  in_productie: { tone: 'warning',  label: 'În producție' },
  montat:       { tone: 'progress', label: 'Montat' },
};

export function pieceStatus(value: string | null | undefined): StatusToken {
  const k = norm(value).replace(/\s+/g, '_');
  return PIECE[k] ?? { tone: 'neutral', label: value || '—' };
}



export function materialStatus(value: string | null | undefined): StatusToken {
  const k = norm(value);
  if (k === 'epuizat' || k === 'out_of_stock') return { tone: 'danger',  label: 'Epuizat' };
  if (k === 'stoc redus' || k === 'stoc_redus' || k === 'low_stock') return { tone: 'warning', label: 'Stoc redus' };
  return { tone: 'success', label: 'În stoc' };
}




export function genericStatus(value: string | null | undefined): StatusToken {
  return value ? { tone: 'neutral', label: value } : NEUTRAL;
}
