









import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { PAGE_IDS, type PageId } from '@/config/constants';
import { STORAGE_KEYS, setStorage, getStorage } from '@/config/localStorage';
import type { Breadcrumb } from '@/core/types';





const MAX_HISTORY = 20;

interface NavigationState {
  
  currentPage: PageId;

  
  pageHistory: PageId[];

  
  selectedProjectId: number | null;
  selectedStationId: number | null;
  productionPiecesFocusId: number | null;

  
  projectsChrome: { breadcrumbs: Breadcrumb[]; title: string } | null;

  
  navigateTo: (page: PageId, opts?: { projectId?: number }) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  selectProject: (projectId: number | null) => void;
  selectStation: (stationId: number | null) => void;
  setProductionPiecesFocus: (projectId: number | null) => void;
  setProjectsChrome: (breadcrumbs: Breadcrumb[], title: string) => void;
  clearProjectsChrome: () => void;
  reset: () => void;
}





export const useNavigationStore = create<NavigationState>()(
  subscribeWithSelector((set, get) => ({
    
    currentPage: (getStorage(STORAGE_KEYS.LAST_PAGE) || PAGE_IDS.DASHBOARD) as PageId,
    pageHistory: [],
    selectedProjectId: null,
    selectedStationId: null,
    productionPiecesFocusId: null,
    projectsChrome: null,

    
    
    

    navigateTo: (page, opts) => {
      const current = get().currentPage;
      const history = get().pageHistory;

      
      const projectUpdate = page === PAGE_IDS.PARTS_TREE && opts?.projectId
        ? { selectedProjectId: opts.projectId }
        : {};

      set({
        currentPage: page,
        
        pageHistory: current !== page
          ? [...history.slice(-(MAX_HISTORY - 1)), current]
          : history,
        
        ...(page !== PAGE_IDS.PROJECTS
          ? { selectedProjectId: null }
          : {}),
        ...(page !== PAGE_IDS.STATIONS && page !== PAGE_IDS.STATION_DETAIL
          ? { selectedStationId: null }
          : {}),
        ...projectUpdate,
      });
      setStorage(STORAGE_KEYS.LAST_PAGE, page);
    },

    goBack: () => {
      const history = get().pageHistory;
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      set({
        currentPage: prev,
        pageHistory: history.slice(0, -1),
      });
      setStorage(STORAGE_KEYS.LAST_PAGE, prev);
    },

    canGoBack: () => get().pageHistory.length > 0,

    selectProject: (projectId) => {
      set({
        selectedProjectId: projectId,
        selectedStationId: null,
      });
    },

    selectStation: (stationId) => {
      set({
        selectedStationId: stationId,
      });
    },

    setProductionPiecesFocus: (projectId) => {
      set({ productionPiecesFocusId: projectId });
    },

    setProjectsChrome: (breadcrumbs, title) => {
      set({
        projectsChrome: { breadcrumbs, title },
      });
    },

    clearProjectsChrome: () => {
      set({ projectsChrome: null });
    },

    reset: () => {
      set({
        currentPage: PAGE_IDS.DASHBOARD,
        pageHistory: [],
        selectedProjectId: null,
        selectedStationId: null,
        productionPiecesFocusId: null,
        projectsChrome: null,
      });
      setStorage(STORAGE_KEYS.LAST_PAGE, PAGE_IDS.DASHBOARD);
    },
  }))
);








export function useCurrentPage(): PageId {
  return useNavigationStore(state => state.currentPage);
}




export function useSelectedProjectId(): number | null {
  return useNavigationStore(state => state.selectedProjectId);
}




export function useSelectedStationId(): number | null {
  return useNavigationStore(state => state.selectedStationId);
}
