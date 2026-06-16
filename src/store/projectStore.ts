








import { create } from 'zustand';
import { apiCommand } from '@/api/commands';
import type { Project } from '@/core/types';
import { useDashboardStore } from './dashboardStore';



function syncDashboard(): void {
  void useDashboardStore.getState().invalidate();
}





export interface BoardStage {
  id: number;
  name: string;
  order_index: number;
  description: string | null;
}

export interface BoardProject {
  id: number;
  name: string;
  client_name: string;
  priority: string;
  deadline: string | null;
  estimated_value: number;
  comment_count: number;
  time_entries_count: number;
}

export interface BoardColumn {
  stage: BoardStage;
  projects: BoardProject[];
}

export interface ProjectStats {
  total?: number;
  in_production?: number;
  approved?: number;
  blocked?: number;
  completed?: number;
  [k: string]: unknown;
}

interface ProjectState {
  
  projects: Project[];
  productionBoard: BoardColumn[];
  productionStats: ProjectStats | null;

  
  loadingProjects: boolean;
  loadingBoard: boolean;

  
  projectsLoaded: boolean;
  boardLoaded: boolean;
  statsLoaded: boolean;

  
  fetchProjects: (force?: boolean) => Promise<Project[]>;
  fetchProductionBoard: (force?: boolean) => Promise<BoardColumn[]>;
  fetchProductionStats: (force?: boolean) => Promise<ProjectStats | null>;
  refreshAll: () => Promise<void>;

  
  
  moveProjectToStage: (projectId: number, toStageId: number) => Promise<void>;
  updateProject: (id: number, patch: Record<string, unknown>) => Promise<void>;
  createProject: (payload: Record<string, unknown>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;

  
  
  invalidate: () => Promise<void>;
}










export function deriveStatusFromStageId(stageId: number | null | undefined, fallback: string): string {
  if (stageId == null) return fallback;
  if (fallback === 'blocat' || fallback === 'anulat') return fallback;
  switch (stageId) {
    case 1: return 'ofertă';
    case 2: return 'aprobat';
    case 8: return 'livrare';
    case 9: return 'finalizat';
    default: return 'în producție';
  }
}

function applyMoveToBoard(
  board: BoardColumn[],
  projectId: number,
  toStageId: number,
): BoardColumn[] {
  
  const project = board.flatMap(c => c.projects).find(p => p.id === projectId);
  if (!project) return board;

  return board.map(col => {
    if (col.stage.id === toStageId) {
      
      if (col.projects.some(p => p.id === projectId)) return col;
      return { ...col, projects: [...col.projects, project] };
    }
    
    return { ...col, projects: col.projects.filter(p => p.id !== projectId) };
  });
}

function applyPatchToProjects(
  projects: Project[],
  id: number,
  patch: Record<string, unknown>,
): Project[] {
  return projects.map(p => (p.id === id ? ({ ...p, ...patch } as Project) : p));
}





export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  productionBoard: [],
  productionStats: null,
  loadingProjects: false,
  loadingBoard: false,
  projectsLoaded: false,
  boardLoaded: false,
  statsLoaded: false,

  fetchProjects: async (force = false) => {
    if (!force && get().projectsLoaded) return get().projects;
    set({ loadingProjects: true });
    try {
      const data = await apiCommand<Project[]>('get_projects');
      const projects = Array.isArray(data) ? data : [];
      set({ projects, projectsLoaded: true, loadingProjects: false });
      return projects;
    } catch (err) {
      console.error('[projectStore] fetchProjects failed:', err);
      set({ loadingProjects: false });
      return get().projects;
    }
  },

  fetchProductionBoard: async (force = false) => {
    if (!force && get().boardLoaded) return get().productionBoard;
    set({ loadingBoard: true });
    try {
      const data = await apiCommand<BoardColumn[]>('get_production_board');
      const productionBoard = Array.isArray(data) ? data : [];
      set({ productionBoard, boardLoaded: true, loadingBoard: false });
      return productionBoard;
    } catch (err) {
      console.error('[projectStore] fetchProductionBoard failed:', err);
      set({ loadingBoard: false });
      return get().productionBoard;
    }
  },

  fetchProductionStats: async (force = false) => {
    if (!force && get().statsLoaded) return get().productionStats;
    try {
      const data = await apiCommand<ProjectStats>('get_project_stats');
      set({ productionStats: data ?? null, statsLoaded: true });
      return data ?? null;
    } catch (err) {
      console.error('[projectStore] fetchProductionStats failed:', err);
      return get().productionStats;
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchProjects(true),
      get().fetchProductionBoard(true),
      get().fetchProductionStats(true),
    ]);
  },

  moveProjectToStage: async (projectId, toStageId) => {
    const prevBoard = get().productionBoard;
    const prevProjects = get().projects;

    
    
    const proj = prevProjects.find(p => p.id === projectId);
    const newStatus = proj ? deriveStatusFromStageId(toStageId, proj.status) : undefined;
    set({
      productionBoard: applyMoveToBoard(prevBoard, projectId, toStageId),
      projects: newStatus
        ? prevProjects.map(p => p.id === projectId ? { ...p, status: newStatus } : p)
        : prevProjects,
    });

    try {
      await apiCommand('update_project', { id: projectId, stage_id: toStageId });
      await Promise.all([
        get().fetchProductionBoard(true),
        get().fetchProjects(true),
        get().fetchProductionStats(true),
      ]);
      syncDashboard();
    } catch (err) {
      set({ productionBoard: prevBoard, projects: prevProjects });
      throw err;
    }
  },

  updateProject: async (id, patch) => {
    await apiCommand('update_project', { id, ...patch });
    set({ projects: applyPatchToProjects(get().projects, id, patch) });
    await Promise.all([
      get().fetchProductionBoard(true),
      get().fetchProductionStats(true),
    ]);
    syncDashboard();
  },

  createProject: async (payload) => {
    await apiCommand('create_project', payload);
    await Promise.all([
      get().fetchProjects(true),
      get().fetchProductionBoard(true),
      get().fetchProductionStats(true),
    ]);
    syncDashboard();
  },

  deleteProject: async (id) => {
    await apiCommand('delete_project', { id });
    set({ projects: get().projects.filter(p => p.id !== id) });
    await Promise.all([
      get().fetchProductionBoard(true),
      get().fetchProductionStats(true),
    ]);
    syncDashboard();
  },

  invalidate: async () => {
    await get().refreshAll();
  },
}));





export const useProjects = () => useProjectStore(s => s.projects);
export const useProductionBoard = () => useProjectStore(s => s.productionBoard);
export const useProductionStats = () => useProjectStore(s => s.productionStats);
