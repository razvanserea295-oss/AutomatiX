import { normalizeRole } from './access';









export function getRoleDisplayLabel(roleName: string | undefined | null): string {
  const r = normalizeRole(roleName);
  if (r === 'admin') return 'Administrator';
  if (r === 'user')  return 'Utilizator';
  if (r === 'viewer') return 'Vizitator';
  
  
  return roleName ? roleName.replace(/_/g, ' ') : 'Utilizator';
}

export function getRoleWorkspaceTagline(roleName: string | undefined | null): string {
  const r = normalizeRole(roleName);
  if (r === 'admin') return 'Control total aplicație';
  return 'Suite operațională';
}

export function getDashboardHeroForRole(roleName: string | undefined | null): { title: string; subtitle: string } {
  const r = normalizeRole(roleName);
  if (r === 'admin') {
    return { title: 'Panou administrare', subtitle: 'Control total: utilizatori, configurare sistem, audit.' };
  }
  return { title: 'Centru de comandă', subtitle: 'Proiecte, producție, financiar, echipă.' };
}

export function getRoleDashboardHints(roleName: string | undefined | null): string[] {
  const r = normalizeRole(roleName);
  if (r === 'admin') {
    return [
      'Gestionează utilizatori și roluri',
      'Configurează permisiuni per user (Pagina Users → Permisiuni)',
      'Verifică audit log-ul pentru orice modificare',
    ];
  }
  return [
    'Vezi statusul tuturor proiectelor',
    'Monitorizează producția și piesele de comandat',
    'Verifică financiarul și deplasările',
  ];
}

export type NavGroupDef = {
  title: string;
  itemIds: string[];
};











export function getNavGroupsForRole(
  roleName: string | undefined | null,
): NavGroupDef[] {
  const r = normalizeRole(roleName);

  if (r === 'admin') {
    return [
      { title: '', itemIds: ['dashboard', 'personal-workspace'] },
      { title: '', itemIds: [
        'sales-workspace',
        'projects-contracts-workspace',
        'engineering-workspace',
        'production-workspace',
        'procurement-workspace',
        'finance-workspace',
        'comunicare-workspace',
        'instrumente-workspace',
        'sistem-workspace',
      ] },
    ];
  }

  
  return [
    { title: '', itemIds: ['dashboard', 'personal-workspace'] },
    { title: '', itemIds: [
      'sales-workspace',
      'projects-contracts-workspace',
      'engineering-workspace',
      'production-workspace',
      'procurement-workspace',
      'finance-workspace',
      'comunicare-workspace',
      'instrumente-workspace',
      'settings',
    ] },
  ];
}
