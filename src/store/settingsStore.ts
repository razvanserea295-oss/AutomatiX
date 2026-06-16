










import { useMemo } from 'react';
import { create } from 'zustand';
import { apiCommand } from '@/api/commands';
import { convertMoney, formatMoney } from '@/lib/format';


const FALLBACK_RATE = 4.97;

interface CompanySettings {
  eur_to_ron_rate?: number | null;
  default_currency?: string | null;
  eur_to_ron_rate_updated_at?: string | null;
  eur_to_ron_rate_source?: string | null;
  [k: string]: unknown;
}

interface SettingsState {
  eurToRonRate: number;
  defaultCurrency: string;
  rateUpdatedAt: string | null;
  rateSource: string | null;
  loaded: boolean;
  load: (force?: boolean) => Promise<void>;
  setFromSettings: (s: CompanySettings | null | undefined) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  eurToRonRate: FALLBACK_RATE,
  defaultCurrency: 'RON',
  rateUpdatedAt: null,
  rateSource: null,
  loaded: false,

  load: async (force = false) => {
    if (!force && get().loaded) return;
    try {
      const s = await apiCommand<CompanySettings>('get_company_settings');
      get().setFromSettings(s);
    } catch {
      
      set({ loaded: true });
    }
  },

  setFromSettings: (s) => {
    const rate = Number(s?.eur_to_ron_rate);
    set({
      eurToRonRate: rate > 0 ? rate : FALLBACK_RATE,
      defaultCurrency: (s?.default_currency as string) || 'RON',
      rateUpdatedAt: (s?.eur_to_ron_rate_updated_at as string | null) ?? null,
      rateSource: (s?.eur_to_ron_rate_source as string | null) ?? null,
      loaded: true,
    });
  },
}));


export const useEurRate = () => useSettingsStore(s => s.eurToRonRate);

export const useDefaultCurrency = () => useSettingsStore(s => s.defaultCurrency);














export const useMoney = () => {
  const displayCurrency = useSettingsStore(s => s.defaultCurrency);
  const eurRate = useSettingsStore(s => s.eurToRonRate);
  // Memoize the formatter identity so the ~48 consumer components don't
  // re-render on every parent render just because useMoney() returned a fresh
  // closure each call. Identity changes only when currency/rate change (T2.4).
  return useMemo(() => {
    return (
      value: number,
      nativeCurrency: string | null | undefined = 'RON',
      maximumFractionDigits?: number,
    ): string =>
      formatMoney(
        convertMoney(value || 0, nativeCurrency, displayCurrency, eurRate),
        displayCurrency,
        maximumFractionDigits,
      );
  }, [displayCurrency, eurRate]);
};
