# Deploy — Promix Automatix (web/server)

Promix runs as a single Node/Express process that serves both the React SPA and
the `/api` backend on one port (default **3500**). It is **not** an Electron
desktop app. In production you put an HTTPS reverse proxy in front of it; the
bundled `docker-compose.yml` does that with [Caddy](https://caddyserver.com/)
(automatic Let's Encrypt certificates).

The database is a single SQLite file (`data/promix.db`) that is **AES-256-GCM
encrypted at rest**. The key lives in `data/.dbkey` (auto-generated on first
boot) or is supplied via the `PROMIX_DB_KEY` env var. **If the key is lost, the
database and all backups are unrecoverable — back it up off-server.**

---

## Option A — Docker Compose (recommended)

Prerequisites: a Linux host with Docker + Docker Compose, a domain whose DNS
A/AAAA record points at the host, and ports **80** and **443** open.

```bash
# 1. Configure
cp .env.example .env
#    edit .env → set PROMIX_DOMAIN and PROMIX_DB_KEY (openssl rand -hex 32)

# 2. Build + start (app + Caddy)
docker compose up -d --build

# 3. Watch it come up
docker compose logs -f app
```

Caddy obtains the TLS certificate on first request, then the app is live at
`https://<PROMIX_DOMAIN>`.

**First login:** `admin` / `1234`. Migration 099 forces a password change on
that first login — set a strong password immediately. (If the admin password was
already rotated, no prompt appears.)

Update to a new version:

```bash
git pull
docker compose up -d --build      # or: docker compose pull && docker compose up -d
```

### Using the released image instead of building

Tagged releases (`vX.Y.Z`) publish an image to GHCR. In `docker-compose.yml`
comment out `build: .` and set `image: ghcr.io/<owner>/<repo>:latest`, then:

```bash
docker compose pull && docker compose up -d
```

---

## Option B — bare metal / systemd (no Docker)

```bash
npm ci
npm run build:prod          # vite build (-> dist/) + tsc server (-> dist-server/)
PROMIX_PORT=3500 npm start   # node dist-server/server/index.js
```

Put nginx/Caddy in front for TLS and run it under a process manager. Minimal
systemd unit:

```ini
[Unit]
Description=Promix Automatix
After=network.target

[Service]
WorkingDirectory=/opt/promix
EnvironmentFile=/opt/promix/.env
ExecStart=/usr/bin/node dist-server/server/index.js
Restart=always
User=promix

[Install]
WantedBy=multi-user.target
```

A matching Caddyfile for a non-Docker host:

```
app.example.com {
	encode zstd gzip
	reverse_proxy localhost:3500
}
```

---

## Environment variables

See `.env.example` for the full annotated list. The essentials:

| Variable | Purpose | Default |
|---|---|---|
| `PROMIX_DOMAIN` | Public domain (Caddy TLS + CORS origin) | — (required for public) |
| `PROMIX_DB_KEY` | 64-hex AES key for the DB at rest | auto-gen `data/.dbkey` |
| `PROMIX_PORT` | Listen port | `3500` |
| `PROMIX_TRUST_PROXY` | Read X-Forwarded-For behind a proxy | `1` in compose |
| `PROMIX_ALLOWED_ORIGINS` | CORS allowlist | locked to domain in compose |
| `PROMIX_BODY_LIMIT` | `/api/cmd` JSON body cap (lower to `50mb` if internet-facing) | `500mb` |
| `PROMIX_EMAIL_TLS_INSECURE` | Skip SMTP cert check (self-signed relay only) | unset = verify |
| `AI_SERVICE_TOKEN`, `PROMIX_SERVICE_PASSWORD` | Optional AI service | — |

---

## Data, backups & restore

Everything stateful lives in the **`data/` volume**: the encrypted DB, the
`.dbkey`, and rolling backups. The server takes an automatic backup before every
migration and on a rolling schedule.

```bash
# Back up the whole data dir (DB + key + backups)
docker compose cp app:/app/data ./promix-data-backup

# Restore: stop, replace the file, start
docker compose down
#   copy your backup over data/promix.db in the promix-data volume
docker compose up -d
```

Keep the `.dbkey` backed up **separately and securely** — it decrypts everything.

---

## Health & monitoring

- `GET /api/health` → `{ "status": "ok", "version": "...", "mode": "server" }`
  (used by the Docker `HEALTHCHECK` and any external monitor).
- Live updates use Server-Sent Events at `/api/events` with a 25s heartbeat;
  the bundled Caddyfile streams it without buffering.

---

## Pre-flight checklist

- [ ] `PROMIX_DOMAIN` set and DNS points to the host; 80/443 open
- [ ] `PROMIX_DB_KEY` generated **and backed up off-server**
- [ ] First admin login completed → default `1234` password changed
- [ ] `data/` volume included in your backup routine
- [ ] (If email) certificates verified — `PROMIX_EMAIL_TLS_INSECURE` unset
- [ ] (If AI service) `PROMIX_SERVICE_PASSWORD` + `AI_SERVICE_TOKEN` set; it
      refuses to start with the `CHANGE_ME` placeholder
- [ ] CI green (`.github/workflows/ci.yml`) before tagging a release
