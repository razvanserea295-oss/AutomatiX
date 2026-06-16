import {
  Search, FolderKanban, Building2, Package, FileText, Wrench, Box,
} from 'lucide-react';

export interface SearchHit {
  type: 'project' | 'client' | 'material' | 'document' | 'station' | 'piece';
  id: number;
  title: string;
  subtitle: string;
  match_field: string;
}

export interface SearchResult {
  query: string;
  total: number;
  hits: SearchHit[];
}

export const TYPE_META: Record<SearchHit['type'], { label: string; icon: typeof Search; color: string }> = {
  project:  { label: 'Proiect',   icon: FolderKanban, color: 'text-accent' },
  client:   { label: 'Client',    icon: Building2,    color: 'text-status-blue' },
  material: { label: 'Material',  icon: Package,      color: 'text-status-amber' },
  document: { label: 'Document',  icon: FileText,     color: 'text-status-purple' },
  station:  { label: 'Statie',    icon: Wrench,       color: 'text-status-teal' },
  piece:    { label: 'Piesa',     icon: Box,          color: 'text-content-secondary' },
};

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
