// UI5 web-components runtime assets (Horizon theme + i18n + CLDR locale data)
// registered LOCALLY so nothing is fetched from a CDN at runtime — the strict
// CSP (connect-src/font-src 'self') blocks external origins, which would white-
// screen every UI5-based screen. MUST stay the very first import.
import './ui5-config';
import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root'
import TauriUpdater from './components/TauriUpdater'
// Redesign flip: monochrome / Apple-style token system replaces the old theme.
// Same CSS-variable names → the existing app (incl. the old navbar + sidebar)
// re-skins automatically. Revert these two lines to './index.css' +
// './styles/theme.css' to restore the previous look.
import './redesign/index.css'
import './redesign/theme.css'
import { applyTheme, readPersistedTheme } from './store/themeStore'
import { applyAccent, readPersistedAccent } from './store/accentStore'
import { applyMotion, readPersistedMotion } from './store/motionStore'
import { applyCardTransparency, readPersistedCardTransparency } from './store/cardTransparencyStore'
import { applyNavSync, readPersistedNavSync } from './store/navSyncStore'
import { applyShellLayout, readPersistedShellLayout } from './store/shellLayoutStore'
import { applyUiScale } from './lib/uiScale'
import { initPageTransitions } from './lib/pageTransitions'
import { initPerfTier } from './lib/perfTier'
import { isDesktopRuntime } from './lib/runtime'

// Mark the new UI active (harmless marker any conditional CSS can key off).
document.documentElement.dataset.ui = 'new';

// Apply persisted theme BEFORE React mounts so the first paint matches the
// user's saved preference. Otherwise dark↔light hydration would flash.
applyTheme(readPersistedTheme());
// Re-apply the persisted accent override (if any) before first paint.
applyAccent(readPersistedAccent());
applyMotion(readPersistedMotion());
applyCardTransparency(readPersistedCardTransparency());
applyNavSync(readPersistedNavSync());
applyShellLayout(readPersistedShellLayout());
applyUiScale(); // root font-size from density + text-scale combined

// Resolve the device performance tier before first paint so the heavy effects
// (backdrop blur, ambient orbs, page transitions) render at the right cost
// from frame one.
initPerfTier();

// Flag View Transitions support + take manual scroll-restoration control.
initPageTransitions();

// Register the PWA service worker so the live web app is installable and can be
// wrapped into a signed Android APK (TWA). Browser-web only — never Electron or
// Tauri (they load from file:// / tauri.localhost). Only a secure context
// (https / localhost) allows registration; plain-HTTP LAN no-ops (caught below).
if (import.meta.env.DEV) {
  // Dev mode: never run the PWA service worker. It precaches the app shell and
  // serves stale modules, which silently breaks HMR and makes you test old code
  // after every edit. Tear down any SW + caches left over from a prior prod run.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
  }
} else if (
  'serviceWorker' in navigator &&
  !isDesktopRuntime()
) {
  // PWA service worker is DISABLED. The prior worker cached /api responses —
  // including the multi-tenant /t/<slug>/api/* paths its "never cache /api"
  // guard missed — so clients were stranded on STALE DATA (uploads not showing,
  // edits reverting, lists flapping). Instead of registering, tear down any
  // worker + caches left from an old build so every client self-heals. The
  // kill-switch /sw.js finishes the job for clients still holding the old worker
  // (picked up via the browser's SW update check on the next navigation).
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* Root selects the presentation layer: SaaS (<App/>, default & unchanged) or
        the SAP Fiori tree (<FioriApp/>) when promix_ui_mode / ?ui=fiori is set. */}
    <Root />
    {/* Desktop-only auto-update toast — renders null outside the Tauri shell. */}
    <TauriUpdater />
  </React.StrictMode>,
)

// Dismiss boot screen once React has mounted. The 800 ms floor keeps the
// splash visible long enough on fast LAN connections (prevents a flash).
setTimeout(() => window.dispatchEvent(new Event('app:ready')), 800)
