// Maps a domain status string to a UI5 ObjectStatus `state` (semantic colour).
// Pure helper — used WITH the real <ObjectStatus> control, not a replacement for it.
export type Ui5State = 'None' | 'Positive' | 'Critical' | 'Negative' | 'Information';

const MAP: Record<string, Ui5State> = {
  // Positive (green)
  active: 'Positive', activa: 'Positive', activ: 'Positive', success: 'Positive',
  completed: 'Positive', finalizat: 'Positive', finalizata: 'Positive', done: 'Positive',
  ok: 'Positive', platita: 'Positive', platit: 'Positive', aprobat: 'Positive',
  aprobata: 'Positive', livrat: 'Positive', livrata: 'Positive', incasat: 'Positive',
  // Critical (amber)
  warning: 'Critical', pending: 'Critical', in_progress: 'Critical', 'in-progress': 'Critical',
  'in progres': 'Critical', 'in lucru': 'Critical', partial: 'Critical', partiala: 'Critical',
  asteptare: 'Critical', 'in asteptare': 'Critical', emisa: 'Critical', trimisa: 'Critical',
  'in productie': 'Critical', negociere: 'Critical', 'in negociere': 'Critical',
  // Negative (red)
  error: 'Negative', inactive: 'Negative', inactiv: 'Negative', inactiva: 'Negative',
  cancelled: 'Negative', anulat: 'Negative', anulata: 'Negative', rejected: 'Negative',
  respins: 'Negative', respinsa: 'Negative', overdue: 'Negative', restanta: 'Negative',
  scadenta: 'Negative', expirat: 'Negative', expirata: 'Negative', blocat: 'Negative',
  // Information (blue)
  draft: 'Information', info: 'Information', new: 'Information', nou: 'Information',
  noua: 'Information', open: 'Information', deschis: 'Information', deschisa: 'Information',
  ciorna: 'Information',
};

export function statusState(status: string | null | undefined): Ui5State {
  if (!status) return 'None';
  return MAP[status.toLowerCase().trim()] ?? 'None';
}
