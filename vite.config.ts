import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Single source of truth for the app version: package.json. Injected at build
// time as __APP_VERSION__ so the UI never drifts from the real release number.
const pkgVersion = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf8"),
).version as string;

export default defineConfig(({ mode }) => {
  // The Tauri desktop shell renders inside Windows WebView2 (evergreen Chromium),
  // so the desktop build can target a modern baseline — no legacy transpile or
  // polyfills (smaller, faster bundle) — and skip the dev-only kitchensink page.
  // The normal WEB build keeps Vite's broad default target + both HTML entries.
  const isTauri = mode === 'tauri';

  const base = isTauri ? './' : '/';

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(pkgVersion),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
      // wouter brings its own React via JSX; deduping avoids "Invalid hook call"
      // when Vite's optimizer caches a second copy under .vite/deps.
      dedupe: ['react', 'react-dom'],
    },
    clearScreen: false,
    optimizeDeps: {
      exclude: [],
      include: [
        'wouter', 'wouter/use-hash-location',
        // Only the packages with a real root export can be pre-bundled here.
        // @ui5/webcomponents, -fiori and -icons are namespace-only (imported via
        // subpaths, no "." specifier) — listing them crashes dev-server startup
        // with: Missing "." specifier in "@ui5/webcomponents".
        '@ui5/webcomponents-react', '@ui5/webcomponents-base',
      ],
      entries: ["src/**/*.{ts,tsx}", "index.html"],
    },
    build: {
      // WebView2 is evergreen Chromium → target it directly for the desktop build.
      target: isTauri ? 'chrome105' : undefined,
      cssTarget: isTauri ? 'chrome105' : undefined,
      // Split heavy vendor libs into separate chunks so they load on demand
      rollupOptions: {
        // Multi-page on web (main app + redesign kitchen-sink preview); desktop
        // only needs the real app.
        input: isTauri
          ? { main: resolve(__dirname, 'index.html') }
          : {
              main: resolve(__dirname, 'index.html'),
              kitchensink: resolve(__dirname, 'kitchensink.html'),
              landing: resolve(__dirname, 'landing.html'),
              manager: resolve(__dirname, 'manager.html'),
            },
        output: {
          manualChunks: {
            'vendor-react':  ['react', 'react-dom'],
            'vendor-ui5':    ['@ui5/webcomponents-react'],
            'vendor-motion': ['framer-motion'],
            'vendor-charts': ['recharts'],
            'vendor-icons':  ['lucide-react'],
            'vendor-cad':    ['dxf'],
            'vendor-office': ['xlsx'],
            'vendor-sql':    ['sql.js'],
            'vendor-utils':  ['date-fns', 'uuid', 'clsx', 'tailwind-merge', 'zod', 'zustand', 'hash-wasm'],
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
    server: {
      port: 1420,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3500',
          changeOrigin: true,
          secure: false,
        },
        '/t': {
          target: 'http://127.0.0.1:3500',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './src/test/setup.ts',
      exclude: ['**/node_modules/**', '**/dist/**', '**/dist-server/**', '**/dist-electron/**', 'tests/e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'html', 'lcov'],
        // Report coverage only for the units we actually exercise today (utils +
        // server/auth services). This keeps the signal honest and lets the floor
        // below be meaningful instead of being diluted to ~1% by the whole app.
        include: [
          'src/lib/format.ts',
          'server/eventLog.ts',
          'electron/services/authService.ts',
        ],
        // Low starting floor — ratchet up as coverage grows. CI fails if it drops.
        thresholds: { lines: 40, functions: 40, statements: 40, branches: 50 },
      },
    },
  };
});
