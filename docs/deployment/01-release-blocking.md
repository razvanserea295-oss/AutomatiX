# Stage 1 — Release-blocking

**Target**: 4-5 working days. Without these, the .msi either won't install
(SmartScreen), won't receive updates, or will fail at first client because
`ai-service` needs manual config.

## 1.1 Code signing (Windows)

- [ ] Buy EV Code Signing certificate — Sectigo / DigiCert / SSL.com
  - ~300-400 EUR/year, EV preferred (no SmartScreen warmup needed)
  - Standard OV = 400 reputation builds before SmartScreen trusts; EV = immediate
  - Processing: 3-5 calendar days (vetting)
- [ ] Configure `electron-builder` in `package.json`
  - `win.signingHashAlgorithms: ["sha256"]`
  - `win.certificateFile` + `win.certificatePassword` from env secrets
  - Timestamp server: `http://timestamp.sectigo.com` (or cert issuer's)
- [ ] Add renewal runbook to `docs/deployment/runbooks/` — annual cert rotation
- [ ] Test: install signed .msi on a fresh Win11 VM, confirm no "Windows protected your PC" prompt

**Estimate**: 1 day of work + 3-5 days cert processing wall time.
**Blocked by**: cert purchase (external).

---

## 1.2 Public endpoint for auto-updater

Two viable paths — pick one:

### Option A: GitHub Releases (recommended — free, zero ops)

- [ ] Switch `electron-builder` publish config from `generic` to `github`
  ```json
  "publish": {
    "provider": "github",
    "owner": "promix-automatix",
    "repo": "desktop-app",
    "releaseType": "release"
  }
  ```
- [ ] Generate `GH_TOKEN` with `repo:write` scope, store as CI secret
- [ ] Make the repo private — `electron-updater` supports private repos with token in requestHeaders
- [ ] First manual test release: tag `v3.0.5`, run release locally, verify `.msi` + `latest.yml` + `.blockmap` attached to release
- [ ] Client-side: confirm `resolveFeedUrl()` falls back correctly when GH is unreachable

### Option B: Self-hosted on VPS

- [ ] Provision Hetzner CX11 (~5 EUR/mo) — Ubuntu 24.04
- [ ] Caddy + Let's Encrypt: `updates.promix.ro { reverse_proxy localhost:3500 }`
- [ ] Basic auth or bearer token on `/api/update/*` — otherwise anyone can enumerate installed versions
- [ ] Rsync job from CI → VPS for each release

**Estimate**: 0.5 day (Option A) / 1 day (Option B).
**Blocked by**: domain (if Option B).

---

## 1.3 CI/CD release pipeline

- [ ] `.github/workflows/release.yml` triggered on `v*` tags
- [ ] Matrix: windows-latest (for now); add ubuntu-latest later for Linux builds
- [ ] Steps:
  1. `npm ci`
  2. `tsc -p tsconfig.electron.json`
  3. `vite build`
  4. `electron-builder --win nsis msi --publish always`
  5. Upload artifacts to release
- [ ] Secrets: `CSC_LINK` (cert base64), `CSC_KEY_PASSWORD`, `GH_TOKEN`
- [ ] Pre-flight: run `npm test` + `npm run test:e2e` before build step — fail fast
- [ ] `CHANGELOG.md` auto-generated from `git log --oneline v<prev>..HEAD` into release notes
- [ ] Slack/Discord webhook on release success/failure (optional)

**Estimate**: 1 day.
**Blocked by**: 1.1 (cert needed to sign) or can ship unsigned first to validate pipeline.

---

## 1.4 Bundle ai-service in the .msi

Currently ai-service is started manually. For ship:

- [ ] Decide packaging strategy:
  - **Bundled**: ai-service binary inside .msi via `extraResources` — simpler for client, bigger installer (~600 MB with model? or model downloads on first run)
  - **Separate installer**: client runs `ai-service-setup.msi` once — independent update cycle
  - **Recommended for v1**: bundled *without* the model. App prompts on first run to download via huggingface-cli or built-in downloader.
- [ ] If bundled:
  - [ ] `package.json` → `build.extraResources`: copy Win binary from `ai-service/target/release/` or prebuilt artifact
  - [ ] `electron/ipc/system.ts` → `ai_service_start` auto-run on app boot if not already running
  - [ ] Windows Firewall rule on install (msi action)
- [ ] Model download flow:
  - [ ] `AiModelDownloader` component: shows progress, verifies SHA-256, resumable
  - [ ] Default target: `userData/models/Qwen2.5-14B-Instruct-Q5_K_M.gguf`
  - [ ] Config writer: update `ai-service/config.toml` after download with absolute path
- [ ] Graceful missing-model UI: if file missing at boot, show "Download AI model" call-to-action in Settings

**Estimate**: 1-2 days.
**Blocked by**: decision on bundle-vs-separate.

---

## 1.5 Auto-generate ai-service api_token at install

Currently the token is manual in `config.toml`. For ship:

- [ ] On first ai-service launch: if `[auth].api_token` is empty, generate `openssl rand -hex 32` equivalent in Rust (`rand::thread_rng().gen::<[u8; 32]>()` → hex), write back to `config.toml`
- [ ] Electron main process: after ai-service starts, read token from config.toml and write it via IPC to renderer's `localStorage.AI_SERVICE_TOKEN`
- [ ] Alternative: share the token through a Unix socket / named pipe at startup — safer than file reads across process boundaries
- [ ] Verify: rotating the token requires restarting both ai-service and renderer — acceptable for v1
- [ ] Add Settings UI: "Regenerate AI token" button (for when a token leaks)

**Estimate**: 0.5 day.
**Blocked by**: 1.4 decision (if bundled, main process owns ai-service lifecycle; if separate, token has to be set-once by user).
