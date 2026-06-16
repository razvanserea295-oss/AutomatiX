import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import AppBackground from '@/components/ui/AppBackground';
import GearLogo from '@/components/ui/GearLogo';
import EmptyState from '@/redesign/ui/EmptyState';
import ErrorState from '@/redesign/ui/ErrorState';
import { getServerUrl } from '@/config/server';
import { setStorage, STORAGE_KEYS } from '@/config/localStorage';

type Tenant = { slug: string; name: string };

// Pre-login firm chooser. Shown (in browser-web mode) before LoginPage when no
// firm has been chosen yet. Picking a firm stores its slug and reloads so
// getServerUrl() routes the whole app to that firm via /t/<slug> (same-origin
// path prefix, reverse-proxied by the host server to the right tenant backend).
export default function TenantChooserPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const choose = (slug: string) => {
    setStorage(STORAGE_KEYS.TENANT_SLUG, slug);
    window.location.reload();
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`${getServerUrl()}/api/tenants`, { signal: AbortSignal.timeout(6000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http'))))
      .then((list: Tenant[]) => {
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        // Single-firm install → skip the chooser entirely.
        if (arr.length === 1) { choose(arr[0].slug); return; }
        setTenants(arr);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 app-surface">
      <AppBackground />
      <div className="relative z-10 w-full max-w-sm border border-line bg-surface-elevated p-7 rounded-xl shadow-[var(--elevation-3)]">
        <div className="flex flex-col items-center text-center mb-6">
          <GearLogo size={44} className="mb-3" />
          <h1 className="text-lg font-semibold text-content-primary">Alege firma</h1>
          <p className="text-pm-xs text-content-muted mt-1">Selectează spațiul de lucru pentru a continua.</p>
        </div>

        {loading ? (
          <p className="text-center text-pm-sm text-content-muted py-6">Se încarcă…</p>
        ) : error ? (
          <ErrorState
            title="Nu am putut încărca firmele"
            description="Verifică conexiunea și reîncearcă."
            onRetry={() => window.location.reload()}
          />
        ) : tenants.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nicio firmă configurată"
            description="Nu există spații de lucru disponibile pentru acest server."
          />
        ) : (
          <div className="space-y-2">
            {tenants.map((t) => (
              <button
                key={t.slug}
                onClick={() => choose(t.slug)}
                className="group w-full flex items-center justify-between gap-3 border border-line bg-surface-primary hover:border-accent hover:bg-accent/5 transition-smooth active:scale-[0.98] px-4 py-3 rounded-lg text-left"
              >
                <span className="font-medium text-content-primary truncate" title={t.name}>{t.name}</span>
                <span className="text-content-muted group-hover:text-accent transition-colors">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
