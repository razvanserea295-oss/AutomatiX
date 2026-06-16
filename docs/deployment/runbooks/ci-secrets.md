# CI secrets — `.github/workflows/release.yml`

Required on the GitHub repo (**Settings → Secrets and variables → Actions**):

| Secret | When | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | Always | Provided by GitHub — publishes the draft release |
| `CSC_LINK` | When signing | Base64-encoded `.pfx` code-signing certificate |
| `CSC_KEY_PASSWORD` | When signing | Password for the `.pfx` |

## Generating `CSC_LINK` from a `.pfx`

```bash
openssl base64 -in promix-code-signing.pfx -out promix-code-signing.pfx.b64
# Paste the full contents of the .b64 file as the CSC_LINK secret value.
```

## Test build without cert

If both `CSC_LINK` and `CSC_KEY_PASSWORD` are absent, the workflow produces an
unsigned `.msi` — useful for smoke-testing the pipeline itself. Windows users
who install it will see a SmartScreen warning on launch.

## Triggering a release

```bash
# Tag a commit (semver) and push — the workflow picks it up
git tag v3.0.5
git push origin v3.0.5
```

The workflow:
1. Builds ai-service (Rust) for `x86_64-pc-windows-msvc`
2. Stages it into `ai-service/dist/win32-x64/`
3. Runs `npm run build:electron` (tsc + vite + electron-builder)
4. Creates a **draft** GitHub release with `.msi`, `.exe`, `.blockmap`, `latest.yml`
5. Review the draft, then publish manually — this is intentional so you
   don't accidentally push half-baked builds to users' auto-updater.

## Manual dispatch (no tag)

Run `workflow_dispatch` from the Actions tab — produces a CI artifact
instead of a release, kept for 14 days. Good for QA smoke tests.
