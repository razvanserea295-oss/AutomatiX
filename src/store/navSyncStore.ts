import { create } from 'zustand';
import { STORAGE_KEYS, getStorage, setStorage, removeStorage } from '@/config/localStorage';

export type NavSync = 'off' | 'on';

export function readPersistedNavSync(): NavSync {
  return getStorage(STORAGE_KEYS.NAV_SYNC) === 'on' ? 'on' : 'off';
}

export function applyNavSync(v: NavSync): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (v === 'on') root.dataset.navSync = 'on';
  else delete root.dataset.navSync;
}

interface NavSyncState {
  navSync: NavSync;
  setNavSync: (v: NavSync) => void;
}

export const useNavSyncStore = create<NavSyncState>((set) => ({
  navSync: readPersistedNavSync(),
  setNavSync: (v) => {
    set({ navSync: v });
    if (v === 'on') setStorage(STORAGE_KEYS.NAV_SYNC, 'on');
    else removeStorage(STORAGE_KEYS.NAV_SYNC);
    applyNavSync(v);
  },
}));
