# Automatix

Business management platform (ERP) for Romanian SMEs — contracts, projects, tasks, service tickets, warehouse, finance, briefings, travel orders (deplasări), licensing and remote support.

## Stack

- **Frontend** — React + TypeScript + Vite + Tailwind SPA (`src/`), with three switchable UI shells (SaaS / Fiori classic / Code) and a separate mobile app entry.
- **Server** — Node.js + Express (`server/`), SQLite via sql.js, multi-tenant (`tenants/registry.json`), served behind a Cloudflare Tunnel.
- **Desktop** — Tauri thin shell (`src-tauri/`) that connects to the cloud server.
- **Landing / manager console** — separate Vite entries (`landing.html`, `manager.html`).

## Development

```bash
npm install
npm run dev        # frontend dev server
npm run build      # production build (dist/ + dist-server/)
node dist-server/server/index.js   # run the built server
```

Database migrations live in `migrations/` and are applied automatically at server boot.

## Not in this repository

Production data, database backups, log files, license signing keys and `.env` files are deliberately excluded — see `.gitignore`. Copy `.env.example` to `.env` to configure a local instance.
