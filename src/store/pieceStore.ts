












import { create } from 'zustand';
import { apiCommand } from '@/api/commands';
import type { ProjectPiece } from '@/types/piece';
import { useProjectStore } from './projectStore';
import { useDashboardStore } from './dashboardStore';

interface PieceState {
  
  piecesByProject: Record<number, ProjectPiece[]>;
  loadingByProject: Record<number, boolean>;
  loadedByProject: Record<number, boolean>;

  fetchPieces: (projectId: number, force?: boolean) => Promise<ProjectPiece[]>;

  
  
  movePieceToStage: (pieceId: number, projectId: number, toStageId: number) => Promise<void>;
  updatePieceStatus: (pieceId: number, projectId: number, status: string) => Promise<void>;
  updatePieceTracking: (pieceId: number, projectId: number, trackingJson: string) => Promise<void>;
  updatePieceHallNotes: (pieceId: number, projectId: number, hallNotes: string) => Promise<void>;
  updatePiece: (
    pieceId: number,
    projectId: number,
    patch: Record<string, unknown>,
  ) => Promise<void>;

  createPiece: (projectId: number, payload: Record<string, unknown>) => Promise<void>;
  deletePiece: (pieceId: number, projectId: number) => Promise<void>;

  
  invalidate: (projectId?: number) => Promise<void>;
}

function applyPatchInList(
  pieces: ProjectPiece[],
  pieceId: number,
  patch: Partial<ProjectPiece>,
): ProjectPiece[] {
  return pieces.map(p => (p.id === pieceId ? ({ ...p, ...patch } as ProjectPiece) : p));
}

async function syncProjectStoreAfterPieceChange(): Promise<void> {
  
  
  const ps = useProjectStore.getState();
  await Promise.all([
    ps.fetchProductionBoard(true),
    ps.fetchProductionStats(true),
  ]).catch(() => undefined);
  
  void useDashboardStore.getState().invalidate();
}

export const usePieceStore = create<PieceState>((set, get) => ({
  piecesByProject: {},
  loadingByProject: {},
  loadedByProject: {},

  fetchPieces: async (projectId, force = false) => {
    const cached = get().piecesByProject[projectId];
    if (!force && get().loadedByProject[projectId] && cached) return cached;

    set(state => ({ loadingByProject: { ...state.loadingByProject, [projectId]: true } }));
    try {
      const data = await apiCommand<ProjectPiece[]>('get_project_pieces', { project_id: projectId });
      const pieces = Array.isArray(data) ? data : [];
      set(state => ({
        piecesByProject: { ...state.piecesByProject, [projectId]: pieces },
        loadingByProject: { ...state.loadingByProject, [projectId]: false },
        loadedByProject: { ...state.loadedByProject, [projectId]: true },
      }));
      return pieces;
    } catch (err) {
      console.error('[pieceStore] fetchPieces failed:', err);
      set(state => ({ loadingByProject: { ...state.loadingByProject, [projectId]: false } }));
      return cached ?? [];
    }
  },

  movePieceToStage: async (pieceId, projectId, toStageId) => {
    const prev = get().piecesByProject[projectId] ?? [];
    
    set(state => ({
      piecesByProject: {
        ...state.piecesByProject,
        [projectId]: applyPatchInList(prev, pieceId, { stage_id: toStageId }),
      },
    }));
    try {
      await apiCommand('update_project_piece', { id: pieceId, stage_id: toStageId });
      
      await get().fetchPieces(projectId, true);
      await syncProjectStoreAfterPieceChange();
    } catch (err) {
      
      set(state => ({ piecesByProject: { ...state.piecesByProject, [projectId]: prev } }));
      throw err;
    }
  },

  updatePieceStatus: async (pieceId, projectId, status) => {
    await get().updatePiece(pieceId, projectId, { status });
  },

  updatePieceTracking: async (pieceId, projectId, trackingJson) => {
    await get().updatePiece(pieceId, projectId, { production_tracking: trackingJson });
  },

  updatePieceHallNotes: async (pieceId, projectId, hallNotes) => {
    await get().updatePiece(pieceId, projectId, { hall_notes: hallNotes });
  },

  updatePiece: async (pieceId, projectId, patch) => {
    await apiCommand('update_project_piece', { id: pieceId, ...patch });
    
    set(state => ({
      piecesByProject: {
        ...state.piecesByProject,
        [projectId]: applyPatchInList(state.piecesByProject[projectId] ?? [], pieceId, patch as Partial<ProjectPiece>),
      },
    }));
    await get().fetchPieces(projectId, true);
    if ('stage_id' in patch || 'status' in patch) {
      await syncProjectStoreAfterPieceChange();
    }
  },

  createPiece: async (projectId, payload) => {
    await apiCommand('create_project_piece', payload);
    await get().fetchPieces(projectId, true);
    await syncProjectStoreAfterPieceChange();
  },

  deletePiece: async (pieceId, projectId) => {
    await apiCommand('delete_project_piece', { id: pieceId });
    set(state => ({
      piecesByProject: {
        ...state.piecesByProject,
        [projectId]: (state.piecesByProject[projectId] ?? []).filter(p => p.id !== pieceId),
      },
    }));
    await syncProjectStoreAfterPieceChange();
  },

  invalidate: async (projectId) => {
    if (projectId == null) {
      set({ piecesByProject: {}, loadedByProject: {}, loadingByProject: {} });
      return;
    }
    await get().fetchPieces(projectId, true);
  },
}));

export const usePiecesForProject = (projectId: number | null) =>
  usePieceStore(s => (projectId == null ? [] : s.piecesByProject[projectId] ?? []));

export const usePiecesLoading = (projectId: number | null) =>
  usePieceStore(s => (projectId == null ? false : !!s.loadingByProject[projectId]));
