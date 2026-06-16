

export interface StationModuleDef {
  slug: string;
  label: string;
}

export const STATION_PIECE_MODULES: readonly StationModuleDef[] = [
  { slug: 'sasiu', label: 'Șasiu' },
  { slug: 'predozare', label: 'Predozare' },
  { slug: 'banda_cantar', label: 'Bandă cântar' },
  { slug: 'skip', label: 'Bandă înclinată / Skip' },
  { slug: 'malaxor', label: 'Malaxor' },
  { slug: 'turn_nivel_1', label: 'Turn nivel I' },
  { slug: 'turn_nivel_2', label: 'Turn nivel II' },
  { slug: 'cantar_ciment', label: 'Cântar ciment' },
  { slug: 'cantar_h2o', label: 'Cântar H2O' },
  { slug: 'snec', label: 'Șnec' },
  { slug: 'silozuri', label: 'Silozuri' },
  { slug: 'cantar_rutier', label: 'Cântar rutier' },
] as const;

const SLUG_SET = new Set(STATION_PIECE_MODULES.map((m) => m.slug));

export function slugToLabel(slug: string): string {
  const m = STATION_PIECE_MODULES.find((x) => x.slug === slug);
  return m?.label ?? slug;
}

export function normalizeTextToStationModuleSlug(raw: string): string | null {
  const flat = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\s+/g, '_');
  const t = flat(raw);
  if (SLUG_SET.has(t)) return t;
  for (const m of STATION_PIECE_MODULES) {
    const lab = m.label
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    const r = raw
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    if (r === lab || r.includes(lab) || lab.includes(r)) return m.slug;
    if (flat(raw) === m.slug) return m.slug;
  }
  const aliases: Record<string, string> = {
    cantar_rutier_auto: 'cantar_rutier',
    banda_inclinata: 'skip',
  };
  const via = aliases[t];
  if (via && SLUG_SET.has(via)) return via;
  return null;
}
