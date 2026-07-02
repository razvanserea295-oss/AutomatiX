# Security notes — automatiX

## Hardening in place (server)

- **DB at rest** is AES-256-GCM encrypted (`PROMIX_DB_KEY` / `data/.dbkey`).
- **`/api/auto-backup/:filename`** is admin-only (Bearer or `?token=`, validated via
  `AuthService.validateSession`, role must be `admin`).
- **Live source update** (`/api/source-archive/upload`) is remote-code-execution by
  design. It is triple-gated: admin role + username allowlist (`PROMIX_RESTART_USERS`)
  + the explicit opt-in flag **`PROMIX_ALLOW_SOURCE_UPDATE=1`**. Leave the flag unset
  on a normal production deploy and the endpoint returns 403.
- **Demo instance** (`:3600`) is opt-in via `PROMIX_RUN_DEMO=1` (does not auto-spawn).
- **Secrets** are not committed: `.dbkey`, `.env`, `*.key`/`*.pem` are gitignored;
  only `.env.example` is tracked.

## Residual dependency CVEs (`npm audit --omit=dev`)

`npm audit fix` (non-breaking) was applied and cleared 8 of 14 advisories. The
remaining **6** all require a **breaking major bump or a dependency replacement**, so
they are deferred rather than force-applied (a `--force` upgrade on a live ERP DB/email
path is higher risk than the advisories themselves until tested):

| Package | Severity | Fix requires | Exposure / notes |
|---------|----------|--------------|------------------|
| `xlsx` (sheetjs) | high ×2 | **No upstream fix** | Prototype Pollution + ReDoS. Used only in `electron/ipc/bomImport.ts` (`xlsx.readFile` on an **admin-uploaded** BOM spreadsheet). Attack surface = a malicious file an authenticated admin chooses to import. **Follow-up:** migrate parsing to `exceljs`, or sandbox/size-cap the parse. |
| `nodemailer` | high | `9.x` (breaking) | Raw-message option can bypass `disableFileAccess`/`disableUrlAccess`. Bumped within-range to 8.0.11; the fix needs 9.0.1. Only reachable through the configured SMTP send path. |
| `semver` (via `imap@0.8.19` → `utf7`) | high | `--force` / drop `imap` | ReDoS. `imap` is unmaintained — **follow-up:** replace with `imapflow` or `node-imap` fork. |
| `uuid` | moderate | `14.x` (breaking) | Missing buffer bounds check in v3/v5/v6 when a `buf` arg is passed (we don't pass one). |

**Recommendation:** schedule the breaking bumps (`nodemailer@9`, `uuid@14`, `imap`
replacement, `xlsx`→`exceljs`) as a dedicated, separately-tested change set — do not
`npm audit fix --force` blind on production.

_Last reviewed: 2026-06-29._
