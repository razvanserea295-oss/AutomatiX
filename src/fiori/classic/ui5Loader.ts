// Classic SAPUI5 runtime loader.
//
// The Fiori UI mode mixes two SAP technologies: the modern @ui5/webcomponents
// (already bundled, used for shell + most pages) AND classic SAPUI5 controls that
// only exist in the full SAPUI5 distribution — Smart Table/Form/FilterBar
// (sap.ui.comp), VizFrame charts (sap.viz), Gantt (sap.gantt), Network Graph /
// Process Flow / Calculation Builder (sap.suite.ui.commons), Micro Charts
// (sap.suite.ui.microchart), PDF Viewer / Planning Calendar (sap.m), Grid/Tree
// Table (sap.ui.table). Those are loaded here, on demand, from SAP's public CDN.
//
// This is loaded ONLY when the Fiori UI mode is active (FioriApp is lazy). The
// bootstrap defines the global `window.sap`; the modern web components don't use
// that namespace, so the two runtimes coexist without collision.
//
// CSP: classic SAPUI5 needs the CDN origin reachable + (for sap.viz) 'unsafe-eval'.
// That allowance lives in server/index.ts, gated behind PROMIX_FIORI_CLASSIC.

// Pinned full SAPUI5 distribution (NOT OpenUI5 — OpenUI5 lacks sap.ui.comp / sap.viz
// / sap.suite). Bump deliberately; "latest" would roll forward unannounced.
const UI5_VERSION = '1.149.0';
const UI5_BASE = `https://ui5.sap.com/${UI5_VERSION}`;

// Libraries preloaded with the core. Keep this to the set the Fiori pages actually
// use — every extra lib is a bigger preload. Extra libs still lazy-load on first
// use of a control from them, so this is a warm-start list, not a hard ceiling.
const UI5_LIBS = [
  'sap.ui.core',
  'sap.m',
  'sap.ui.layout',
  'sap.ui.unified',
  'sap.f',
  'sap.uxap',
  'sap.ui.table',
  'sap.ui.comp',
  'sap.viz',
  'sap.suite.ui.commons',
  'sap.suite.ui.microchart',
].join(',');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SapGlobal = any;

type ThemeMode = 'light' | 'dark';
const themeName = (t: ThemeMode) => (t === 'dark' ? 'sap_horizon_dark' : 'sap_horizon');

let loadPromise: Promise<SapGlobal> | null = null;

/**
 * Inject the SAPUI5 bootstrap once and resolve when the core (and the preloaded
 * libraries) are initialised. Idempotent — repeated calls share one promise.
 */
export function loadClassicUi5(theme: ThemeMode = 'light'): Promise<SapGlobal> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<SapGlobal>((resolve, reject) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      reject(new Error('SAPUI5 loader requires a browser environment'));
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = (window as any).sap;
    if (existing?.ui?.getCore) {
      resolve(existing);
      return;
    }

    const script = document.createElement('script');
    script.id = 'sap-ui-bootstrap';
    script.src = `${UI5_BASE}/resources/sap-ui-core.js`;
    script.async = true;
    script.setAttribute('data-sap-ui-theme', themeName(theme));
    script.setAttribute('data-sap-ui-libs', UI5_LIBS);
    script.setAttribute('data-sap-ui-async', 'true');
    script.setAttribute('data-sap-ui-compatVersion', 'edge');
    script.setAttribute('data-sap-ui-language', 'ro');
    script.setAttribute('data-sap-ui-frameOptions', 'trusted');

    script.onerror = () => {
      loadPromise = null;
      reject(new Error(`Nu s-a putut încărca SAPUI5 de pe ${UI5_BASE}. Verifică conexiunea la internet și CSP-ul (PROMIX_FIORI_CLASSIC).`));
    };
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sap = (window as any).sap as SapGlobal;
      const done = () => resolve(sap);
      try {
        if (sap?.ui?.require) {
          sap.ui.require(['sap/ui/core/Core'], (Core: SapGlobal) => {
            if (Core?.ready) Core.ready().then(done);
            else sap.ui.getCore().attachInit(done);
          });
        } else {
          sap.ui.getCore().attachInit(done);
        }
      } catch {
        sap?.ui?.getCore?.().attachInit?.(done);
      }
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Whether the classic runtime is already initialised (no network round-trip). */
export function isClassicUi5Ready(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any)?.sap?.ui?.getCore;
}

/** Keep the classic Horizon theme in lockstep with the app's light/dark choice. */
export function applyClassicTheme(theme: ThemeMode): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sap = (window as any)?.sap;
  sap?.ui?.getCore?.().applyTheme?.(themeName(theme));
}
