// UI5 web-components runtime assets (Horizon theme + i18n + CLDR locale data)
// registered LOCALLY so nothing is fetched from a CDN at runtime — the strict
// CSP (connect-src/font-src 'self') blocks external origins, which would white-
// screen every UI5-based screen. MUST stay the very first import.
import './ui5-config';
import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root'
import TauriUpdater from './components/TauriUpdater'
// Shared Tailwind + redesign utilities. Theme tokens are scoped:
//   V2 → design-tokens.css under .v2-root / html[data-interface="v2"]
//   Classic (default) → src/classic/classic-tokens.css (VS Code palette)
import './redesign/index.css'
import './redesign/theme.css'
import './redesign/polish-pass.css'
import './classic/classic-tokens.css'
import './components/shell/shell.css'
import '@/v2/styles/globals.css'
import './redesign/enterprise.css' // Stage 0 enterprise flatten — must win the cascade (last)
import { applyTheme, readPersistedTheme } from './store/themeStore'
import { applyAccent, readPersistedAccent } from './store/accentStore'
import { applyMotion, readPersistedMotion } from './store/motionStore'
import { applyCardTransparency, readPersistedCardTransparency } from './store/cardTransparencyStore'
import { applyNavSync, readPersistedNavSync } from './store/navSyncStore'
import { applyShellLayout, readPersistedShellLayout } from './store/shellLayoutStore'
import { applyLayoutMode, readPersistedLayoutMode } from './store/layoutModeStore'
import { applyDensity } from './lib/density'
import { initPageTransitions } from './lib/pageTransitions'
import { initPerfTier } from './lib/perfTier'
import { isDesktopRuntime } from './lib/runtime'
import { applyInterfaceMode, getInterfaceMode } from './v2/lib/interfaceMode'
import { installClientErrorReporter } from './lib/clientErrorReporter'

// Capture uncaught errors / unhandled rejections app-wide and forward them to
// the server log. Installed before anything else so early failures are caught.
installClientErrorReporter()

const CHUNK_RELOAD_KEY = 'promix:chunk-reload-attempted'
let chunkReloadAttemptedInMemory = false

function isDynamicImportChunkError(reason: unknown): boolean {
  const parts: string[] = []
  if (typeof reason === 'string') parts.push(reason)
  if (reason instanceof Error) {
    parts.push(reason.name)
    parts.push(reason.message)
  }
  const text = parts.join(' ').toLowerCase()
  return (
    text.includes('failed to fetch dynamically imported module') ||
    text.includes('importing a module script failed') ||
    text.includes('error loading dynamically imported module') ||
    text.includes('chunkloaderror') ||
    text.includes('loading chunk')
  )
}

function shouldAttemptChunkReload(): boolean {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
    return true
  } catch {
    if (chunkReloadAttemptedInMemory) return false
    chunkReloadAttemptedInMemory = true
    return true
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (!isDynamicImportChunkError(event.reason)) return
    if (!shouldAttemptChunkReload()) return
    event.preventDefault()
    window.location.reload()
  })
}

// Mark the new UI active (harmless marker any conditional CSS can key off).
document.documentElement.dataset.ui = 'new';

// Interface mode BEFORE theme so classic vs v2 token scopes apply on first paint.
applyInterfaceMode(getInterfaceMode());

// Apply persisted theme BEFORE React mounts so the first paint matches the
// user's saved preference. Otherwise dark↔light hydration would flash.
applyTheme(readPersistedTheme());
// Re-apply the persisted accent override (if any) before first paint.
applyAccent(readPersistedAccent());
applyMotion(readPersistedMotion());
applyCardTransparency(readPersistedCardTransparency());
applyNavSync(readPersistedNavSync());
applyShellLayout(readPersistedShellLayout());
applyLayoutMode(readPersistedLayoutMode()); // tiled (default) vs flat sheet
applyDensity(); // data-density + root font-size before first paint

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
    {/* Root always mounts the Modern SaaS app (<App/>). */}
    <Root />
    {/* Desktop-only auto-update toast — renders null outside the Tauri shell. */}
    <TauriUpdater />
  </React.StrictMode>,
)

// Dismiss boot screen once React has mounted (no minimum splash delay).
window.dispatchEvent(new Event('app:ready'))

// Desktop thin-client: auto-reload when the server ships a new frontend build.
// No-op in browser tabs (gated to the desktop shell's User-Agent).
void import('./lib/desktopAutoReload').then((m) => m.startDesktopAutoReload())
