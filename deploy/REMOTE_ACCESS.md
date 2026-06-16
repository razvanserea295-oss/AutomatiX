# Remote access — exposing the PROMIX server over the internet

The Node server (port `3500`) binds to `0.0.0.0` and uses token auth, so it
**already accepts remote clients**. What's missing for safe public exposure
is TLS, an origin allowlist, rate limiting, and real client-IP propagation.

This guide describes two supported paths. Pick one.

---

## Option A — Cloudflare Tunnel (recommended, no port-forwarding)

The PC makes an outbound TCP connection to Cloudflare's edge; Cloudflare
exposes a public HTTPS URL that tunnels back. Works behind NAT, no public IP,
no router config.

```bash
# 1. Install cloudflared
sudo curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# 2. One-time auth (opens a browser)
cloudflared tunnel login

# 3. Create the tunnel
cloudflared tunnel create promix
# → "Created tunnel promix with id <TUNNEL_UUID>"

# 4. Route a DNS name to it (Cloudflare creates the record automatically)
cloudflared tunnel route dns promix promix.example.com

# 5. Edit deploy/cloudflared/config.yml — replace <TUNNEL_UUID> and
#    promix.example.com with real values

# 6. Install service files
sudo useradd -r -s /usr/sbin/nologin cloudflared || true
sudo install -d -o cloudflared -g cloudflared /etc/cloudflared /var/log/cloudflared
sudo cp deploy/cloudflared/config.yml /etc/cloudflared/config.yml
sudo cp ~/.cloudflared/<TUNNEL_UUID>.json /etc/cloudflared/
sudo chown -R cloudflared:cloudflared /etc/cloudflared
sudo cp deploy/cloudflared/cloudflared.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared
```

Then update `promix-server.service`:

```ini
Environment=PROMIX_TRUST_PROXY=1
Environment=PROMIX_ALLOWED_ORIGINS=https://promix.example.com
```

In the desktop client, open *Setări → Conexiune Server* and paste
`https://promix.example.com`.

---

## Option B — Caddy reverse proxy with auto-HTTPS

Use this if you have a static public IP and want to host the cert yourself.
Caddy auto-provisions Let's Encrypt certificates.

```bash
sudo apt install caddy
sudo cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
# Edit the hostname inside the Caddyfile to match your domain.
sudo systemctl reload caddy
```

Open ports 80 and 443 on your router and point your DNS A record at the
public IP. First request to `https://promix.example.com` triggers ACME and
takes ~10s.

Same `promix-server.service` env tweaks as Option A.

---

## What changed in the server to make this safe

The Express server (`server/index.ts`) gained:

| Knob | Default | When to set |
|---|---|---|
| `PROMIX_TRUST_PROXY=1` | off | Always when behind a reverse proxy. Lets the server read `X-Forwarded-For` for audit logs and rate-limit keys. |
| `PROMIX_ALLOWED_ORIGINS=https://app.example.com,https://...` | unset → permissive | Set on public deployments. Comma-separated CORS allowlist. The Electron desktop client has no `Origin` header and is always allowed. |
| `PROMIX_BODY_LIMIT=20mb` | `50mb` | Tighten if you don't upload large attachments. |
| `PROMIX_RATE_LIMIT_OFF=1` | off | Set only on isolated LAN where rate limits hurt more than they help. |

Plus, always-on:
- `helmet` for safe response headers
- 600 req/min/IP global limit on `/api/cmd`
- 20 req/5min/IP limit on `login_user` and `change_password` (skipping successful logins)
- Real client IP threaded into the `sessions` table and `audit_logs`
  (replaces the old hardcoded `127.0.0.1`)

---

## What is NOT exposed publicly

- **Port 8100 (ai-service)** — keep LAN-only. The Rust LLM service has its
  own bearer-token gate but inference is CPU/memory-heavy and a great DOS
  target. The desktop client only ever talks to port 3500; chat requests
  are proxied through there.
- **The auto-updater installer payloads** ARE served publicly (so clients
  can reach them). These are the only unauthenticated endpoints and should
  be code-signed installers; don't drop sensitive files in `updates/`.

---

## Credential rotation (one-time after this PR)

`ai-service/config.toml` was previously git-tracked with a real password and
API token. The file is now in `.gitignore`. Existing checkouts must:

```bash
# Rotate first — assume the leaked values are compromised
# 1. New ERP service password (set in users table)
# 2. New AI bearer token: openssl rand -hex 32

# Then untrack the file
git rm --cached ai-service/config.toml
# Move secrets into the systemd EnvironmentFile pattern below
```

Recommended: keep `ai-service/config.toml.example` checked in as a template,
put real secrets in `/etc/promix/ai-service.env` and reference from
`promix-ai-service.service`:

```ini
EnvironmentFile=/etc/promix/ai-service.env
```

with file contents:

```
PROMIX_SERVICE_PASSWORD=...
AI_SERVICE_TOKEN=...
PROMIX_API_BASE_URL=http://localhost:3500
```
