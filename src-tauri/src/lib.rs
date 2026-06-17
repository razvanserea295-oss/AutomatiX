// Automatix desktop shell (Tauri 2).
//
// This is a THIN SHELL: it bundles the built web frontend (../dist) and renders
// it in a native WebView2 window. The frontend talks to the existing Node/Express
// Promix server (default http://localhost:3500, configurable in-app) over HTTP —
// the desktop app does NOT embed a second database, which is deliberate: it keeps
// ONE source of truth (the server DB) and avoids the stale split-DB problem the
// old Electron build had. No custom Rust commands are needed; the whole API
// surface is the server's /api/cmd endpoint, reached from the webview.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Auto-update: the frontend (src/lib/tauriUpdater.ts) drives the
        // check/download/install flow; `process` provides relaunch after install.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("error while running the Automatix desktop shell");
}
