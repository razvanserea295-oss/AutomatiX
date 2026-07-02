/**
 * Branch Development Store
 * Manages isolated development branches for feature development.
 * Similar to Builder.io's branch-based editing system.
 */

import { create } from 'zustand';

export type BranchStatus = 'draft' | 'in-progress' | 'review' | 'testing' | 'merged' | 'archived';

export interface DevBranch {
  id: string;
  name: string;
  description: string;
  created: string;
  updated: string;
  status: BranchStatus;
  author?: string;
  prd?: string;
  changes?: string[];
  previewUrl?: string;
}

const KEY = 'promix_dev_branches_v1';

// Get or initialize branches
function readBranches(): DevBranch[] {
  if (typeof window === 'undefined') return [];
  const saved = window.localStorage.getItem(KEY);
  if (!saved) return [];
  
  try {
    const parsed = JSON.parse(saved) as DevBranch[];
    return parsed.map(b => ({
      ...b,
      status: b.status as BranchStatus,
    }));
  } catch {
    return [];
  }
}

interface DevBranchState {
  branches: DevBranch[];
  activeBranchId: string | null;
  
  // Branch operations
  createBranch: (name: string, description?: string) => DevBranch;
  switchBranch: (id: string | null) => void;
  updateBranch: (id: string, patch: Partial<Omit<DevBranch, 'id' | 'created'>>) => void;
  deleteBranch: (id: string) => void;
  archiveBranch: (id: string) => void;
  
  // Status helpers
  setActiveBranchStatus: (status: BranchStatus) => void;
  
  // Active branch getter
  get activeBranch(): DevBranch | null;
}

export const useDevBranchStore = create<DevBranchState>((set, get) => ({
  branches: readBranches(),
  activeBranchId: null,
  
  createBranch: (name, description = '') => {
    const now = new Date().toISOString();
    const branch: DevBranch = {
      id: `branch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      description,
      created: now,
      updated: now,
      status: 'draft',
    };
    
    const newBranches = [branch, ...get().branches];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(newBranches));
    } catch { /* quota */ }
    
    set({ branches: newBranches, activeBranchId: branch.id });
    return branch;
  },
  
  switchBranch: (id) => {
    set({ activeBranchId: id });
  },
  
  updateBranch: (id, patch) => {
    const newBranches = get().branches.map(b => 
      b.id === id ? { ...b, ...patch, updated: new Date().toISOString() } : b
    );
    try {
      window.localStorage.setItem(KEY, JSON.stringify(newBranches));
    } catch { /* quota */ }
    set({ branches: newBranches });
  },
  
  deleteBranch: (id) => {
    const newBranches = get().branches.filter(b => b.id !== id);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(newBranches));
    } catch { /* quota */ }
    set({ 
      branches: newBranches,
      activeBranchId: get().activeBranchId === id ? null : get().activeBranchId,
    });
  },
  
  archiveBranch: (id) => {
    get().updateBranch(id, { status: 'archived' });
  },
  
  setActiveBranchStatus: (status) => {
    const { activeBranchId } = get();
    if (activeBranchId) {
      get().updateBranch(activeBranchId, { status });
    }
  },
  
  get activeBranch() {
    const { activeBranchId, branches } = get();
    return branches.find(b => b.id === activeBranchId) || null;
  },
}));

// Hook for branch-aware feature flags
export function useBranchFeature(flag: string): boolean {
  const activeBranch = useDevBranchStore(state => state.activeBranch);
  
  // If no branch, use default (false)
  if (!activeBranch) return false;
  
  // Check branch for feature flag (stored in localStorage with branch-specific key)
  const key = `promix_feature_${flag}_${activeBranch.id}`;
  return typeof window !== 'undefined' && window.localStorage.getItem(key) === 'true';
}

// Create a branch from a PRD
export function createBranchFromPRD(name: string, prd: string, author?: string): DevBranch {
  const branch = useDevBranchStore.getState().createBranch(name, prd);
  useDevBranchStore.getState().updateBranch(branch.id, { 
    prd: prd.substring(0, 500),
    author,
    status: 'in-progress',
  });
  return branch;
}