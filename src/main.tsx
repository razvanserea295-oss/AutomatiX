// UI5 web-components runtime assets (Horizon theme + i18n + CLDR locale data)
// registered LOCALLY so nothing is fetched from a CDN at runtime — the strict
// CSP (connect-src/font-src 'self') blocks external origins, which would white-
// screen every UI5-based screen. MUST stay the very first import.
import './ui5-config';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import TauriUpdater from './components/TauriUpdater'
// Redesign flip: monochrome / Apple-style token system replaces the old theme.
// Same CSS-variable names → the existing app (incl. the old navbar + sidebar)
// re-skins automatically. Revert these two lines to './index.css' +
// './styles/theme.css' to restore the previous look.
import './redesign/index.css'
import './redesign/theme.css'
import { applyTheme, readPersistedTheme } from './store/themeStore'
import { initPageTransitions } from './lib/pageTransitions'
import { initPerfTier } from './lib/perfTier'

// Mark the new UI active (harmless marker any conditional CSS can key off).
document.documentElement.dataset.ui = 'new';

// Apply persisted theme BEFORE React mounts so the first paint matches the
// user's saved preference. Otherwise dark↔light hydration would flash.
applyTheme(readPersistedTheme());

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
const browserWindow = window as Window & Record<string, unknown>;
if (
  'serviceWorker' in navigator &&
  !('electron' in browserWindow) &&
  !('__TAURI_INTERNALS__' in browserWindow) &&
  !('__TAURI__' in browserWindow)
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* non-secure origin / unsupported — ignore */ });
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    {/* Desktop-only auto-update toast — renders null outside the Tauri shell. */}
    <TauriUpdater />
  </React.StrictMode>,
)
