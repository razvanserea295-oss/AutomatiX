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
        .setup(|app| {
            // Round the frameless window's corners on Windows 11 (keeps the native
            // drop shadow). No-op on Windows 10 / older; macOS rounds windows itself.
            #[cfg(windows)]
            {
                use tauri::Manager;
                if let Some(win) = app.get_webview_window("main") {
                    round_window_corners(&win);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Automatix desktop shell");
}

/// Apply Windows 11 rounded corners to a (frameless) window via DWM.
#[cfg(windows)]
fn round_window_corners(window: &tauri::WebviewWindow) {
    use windows_sys::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE};
    // DWMWCP_ROUND = 2 — round the corners if appropriate.
    const DWMWCP_ROUND: i32 = 2;
    if let Ok(hwnd) = window.hwnd() {
        let pref: i32 = DWMWCP_ROUND;
        unsafe {
            let _ = DwmSetWindowAttribute(
                hwnd.0 as _,
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &pref as *const i32 as *const core::ffi::c_void,
                core::mem::size_of::<i32>() as u32,
            );
        }
    }
}
