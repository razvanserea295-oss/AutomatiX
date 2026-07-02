# Quick Support portable (RustDesk)

Place a **preconfigured** RustDesk Windows portable executable here:

- `Promix-QuickSupport.exe` (preferred)
- `Automatix-QuickSupport.exe`
- `rustdesk.exe` (fallback; downloaded as Promix-QuickSupport.exe)

## Quick setup (recommended)

On the server machine:

```bash
npm run support:prepare-bundle
```

This downloads the official RustDesk portable (or copies a local install) and writes `RustDesk2.toml` from your `PROMIX_RUSTDESK_*` env vars.

Or set `PROMIX_REMOTE_SUPPORT_BUNDLE=C:\path\to\rustdesk.exe` and run the script again.


1. Download the official RustDesk portable for Windows x64.
2. Rename to `Promix-QuickSupport.exe`.
3. Add `RustDesk2.toml` in this folder **or** configure the exe for your relay:

```toml
rendezvous_server = 'your-id-server.example.com:21116'
relay_server = 'your-id-server.example.com:21117'
key = 'YOUR_HBBS_PUBLIC_KEY'
```

4. Set the same key and servers in Automatix env (`PROMIX_RUSTDESK_*`).

## Security

- Do not commit the exe to git (large binary).
- Rotate the server key if compromised; replace the portable when keys change.
- Quick support links expire per `PROMIX_REMOTE_QUICK_TTL_HOURS` (default 24h).

See `deploy/rustdesk/README.md` for relay setup.
