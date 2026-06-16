import type { ProductionTracking } from '../types/piece';

export const PHASES: { key: keyof ProductionTracking; label: string }[] = [
  { key: 'proiectare', label: 'Proiectare' },
  { key: 'achizitie_materiale', label: 'Achiziție' },
  { key: 'debitare', label: 'Debitare' },
  { key: 'sudare', label: 'Sudare' },
  { key: 'prelucrare_mecanica', label: 'Prelucrare' },
  { key: 'vopsire', label: 'Vopsire' },
  { key: 'asamblare', label: 'Asamblare' },
  { key: 'dxf', label: 'DXF' },
  { key: 'desene', label: 'Desene' },
  { key: 'executie', label: 'Execuție' },
  { key: 'testare', label: 'Testare' },
  { key: 'livrat', label: 'Livrat' },
  { key: 'montat', label: 'Montat' },
  { key: 'punere_functiune', label: 'Punere în funcțiune' },
];

export const STATUS_OPTS = ['neinceput', 'in_lucru', 'finalizat'] as const;
