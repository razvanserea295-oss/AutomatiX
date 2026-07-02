# RustDesk relay (self-hosted)

Self-hosted **hbbs** (ID server) and **hbbr** (relay) for Automatix Remote Support.

## Quick start

```bash
cd deploy/rustdesk
cp .env.example .env
# Edit .env: set RUSTDESK_KEY (from hbbs first run) and your public hostname
docker compose up -d
```

On first `hbbs` start, note the **public key** printed in logs. Set the same value in:

- `deploy/rustdesk/.env` → `RUSTDESK_KEY`
- Automatix server env → `PROMIX_RUSTDESK_KEY`
- Portable client `RustDesk2.toml` next to `Promix-QuickSupport.exe`

## Automatix environment variables

| Variable | Description |
|----------|-------------|
| `PROMIX_RUSTDESK_ID_SERVER` | Public hostname:port for ID server (hbbs), e.g. `rustdesk.example.com:21116` |
| `PROMIX_RUSTDESK_RELAY_SERVER` | Relay (hbbr), often same host `:21117` |
| `PROMIX_RUSTDESK_KEY` | Server public key from hbbs |
| `PROMIX_RUSTDESK_WEB_WS_URL` | WSS URL for embedded web viewer, e.g. `wss://rustdesk.example.com:21119` |
| `PROMIX_RUSTDESK_VIEWER_PATH` | Optional full path to `rustdesk.exe` on technician PCs |
| `PROMIX_REMOTE_QUICK_TTL_HOURS` | Quick support link TTL (default 24) |
| `PROMIX_COMPANY_NAME` | Branding on guest page (default Promix Automatix) |

## TLS / reverse proxy

Expose these ports (or proxy via Caddy):

- **21116** — hbbs TCP (ID)
- **21117** — hbbr TCP (relay)
- **21118** — hbbs WebSocket (web client)
- **21119** — hbbr WebSocket (web client)

See `caddy-snippet.caddy` for an example Caddyfile block.

## Support bundle

Place a preconfigured portable Windows exe at:

`public/support/Promix-QuickSupport.exe`

Configure `RustDesk2.toml` in the same folder or embed key in the portable per RustDesk docs.

## Technician workflow

1. Open **Instrumente → Asistență la distanță** in Automatix.
2. **Generează link pentru client** and send the link.
3. Customer downloads and runs the portable, shares ID + password.
4. Paste ID + password, click **Conectează** (desktop spawns RustDesk; browser uses web viewer if configured).
5. End session in Automatix when done.
