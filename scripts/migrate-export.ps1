# =====================================================================
#  Automatix -- MIGRATION EXPORT  (run on the OLD PC)
#  ASCII-ONLY on purpose: Windows PowerShell 5.1 reads .ps1 without a BOM
#  as ANSI, so any non-ASCII char (arrows/em-dashes) corrupts parsing.
#
#  Assembles a complete, plug-and-play bundle for a new Windows PC:
#    <Dest>\Automatix-NEW\      -> whole app (build + node_modules + data + keys + config)
#    <Dest>\cloudflared\        -> tunnel binary + config
#    <Dest>\cloudflared-creds\  -> tunnel credentials (cert.pem + <uuid>.json)
#    <Dest>\MIGRATION-RUNBOOK.md
#
#  Usage:
#    .\scripts\migrate-export.ps1 -Dest G:\AutomatixMove
#    .\scripts\migrate-export.ps1 -Dest G:\AutomatixMove -FinalCutover   # after Stop-Automatix.cmd
#
#  Run it TWICE: (1) now, stack running -> bulk copy;
#  (2) at cutover with -FinalCutover, stack STOPPED -> refresh data+tenants only.
# =====================================================================
param(
  [Parameter(Mandatory=$true)][string]$Dest,
  [switch]$FinalCutover
)
$ErrorActionPreference = 'Stop'
$App   = Split-Path -Parent $PSScriptRoot
$Cfd   = 'C:\cloudflared'
$Creds = Join-Path $env:USERPROFILE '.cloudflared'
$destApp = Join-Path $Dest 'Automatix-NEW'

Write-Host ("Export to " + $Dest) -ForegroundColor Cyan
New-Item -ItemType Directory -Path $Dest -Force | Out-Null

# --- data/ + tenants/ : the system of record (copied on BOTH passes) ---
Write-Host "[data] promix.db + .dbkey + email.key + tenants ..." -ForegroundColor Yellow
robocopy "$App\data"    "$destApp\data"    /E /COPY:DAT /R:2 /W:2 /NFL /NDL /NJH /NJS /XF "*.lock" | Out-Null
robocopy "$App\tenants" "$destApp\tenants" /E /COPY:DAT /R:2 /W:2 /NFL /NDL /NJH /NJS /XF "*.lock" | Out-Null

if ($FinalCutover) {
  $db = Get-Item "$App\data\promix.db"
  Write-Host ("FinalCutover: data + tenants refreshed. DB " + $db.Length + " bytes, " + $db.LastWriteTime) -ForegroundColor Green
  return
}

# --- full app tree (bulk pass) ---
# Exclude non-runtime bloat: backups (~11GB), src-tauri\target (~4GB Rust),
# dist-installer (~0.8GB), .git (~1.25GB), dist-electron, updates, build, dev junk.
Write-Host "[app] runtime tree (node_modules, dist, dist-server, config, keys) - slow part ..." -ForegroundColor Yellow
$xd = @(
  '.git','.update-staging','.preview-data','.demo-preview-data','.ds-sync','.design-sync',
  'screenshots','preview-shots','.cursor','updates','dist-electron','build',
  "$App\backups","$App\dist-installer","$App\src-tauri\target",
  "$App\node_modules\.cache","$App\node_modules\.vite","$App\logs\archive"
)
$xf = @('*.lock','build-out.txt','build-installer-run.log','tsc-now.txt','tsc-out2.txt','tsc-rebuild.txt')
$rcArgs = @("$App", "$destApp", '/E','/COPY:DAT','/R:1','/W:1','/MT:16','/NFL','/NDL','/NJH','/NJS','/NP')
foreach ($d in $xd) { $rcArgs += '/XD'; $rcArgs += $d }
foreach ($f in $xf) { $rcArgs += '/XF'; $rcArgs += $f }
& robocopy @rcArgs | Out-Null
Write-Host "       app copied." -ForegroundColor Green

# --- cloudflared (binary + config) ---
Write-Host "[tunnel] cloudflared binary + config ..." -ForegroundColor Yellow
robocopy "$Cfd" (Join-Path $Dest 'cloudflared') /E /COPY:DAT /R:2 /W:2 /NFL /NDL /NJH /NJS | Out-Null

# --- tunnel credentials (cert.pem + <uuid>.json) : CRITICAL ---
Write-Host "[tunnel] credentials (~/.cloudflared) ..." -ForegroundColor Yellow
robocopy "$Creds" (Join-Path $Dest 'cloudflared-creds') /COPY:DAT /R:2 /W:2 /NFL /NDL /NJH /NJS | Out-Null

# --- runbook + manifest ---
Copy-Item (Join-Path $App 'MIGRATION-RUNBOOK.md') (Join-Path $Dest 'MIGRATION-RUNBOOK.md') -Force -ErrorAction SilentlyContinue
$dbHash = (Get-FileHash "$App\data\promix.db" -Algorithm SHA256).Hash
$manifest = @(
  "Automatix migration bundle",
  ("exported_at : " + (Get-Date -Format 'o')),
  ("from_host   : " + $env:COMPUTERNAME),
  ("node_version: " + (node -v)),
  ("db_sha256   : " + $dbHash),
  ("db_bytes    : " + (Get-Item "$App\data\promix.db").Length),
  "NOTE: re-run with -FinalCutover AFTER Stop-Automatix.cmd for the final DB."
)
$manifest | Set-Content (Join-Path $Dest 'BUNDLE-MANIFEST.txt') -Encoding ASCII

# --- verify the critical pieces actually landed ---
$check = @{
  'node_modules'      = (Test-Path "$destApp\node_modules\package.json") -or (Test-Path "$destApp\node_modules")
  'dist-server\index' = Test-Path "$destApp\dist-server\server\index.js"
  'data\.dbkey'       = Test-Path "$destApp\data\.dbkey"
  'data\promix.db'    = Test-Path "$destApp\data\promix.db"
  'license .keys'     = Test-Path "$destApp\tools\license-generator\.keys\ed25519-private.pem"
  '.env'              = Test-Path "$destApp\.env"
  'cloudflared.exe'   = Test-Path (Join-Path $Dest 'cloudflared\cloudflared.exe')
  'tunnel creds json' = (Get-ChildItem (Join-Path $Dest 'cloudflared-creds') -Filter '*.json' -EA SilentlyContinue).Count -gt 0
}
Write-Host ""
Write-Host "=== VERIFY (all must be True) ===" -ForegroundColor Cyan
$allOk = $true
foreach ($k in $check.Keys) { $ok = [bool]$check[$k]; if (-not $ok) { $allOk = $false }; ("  {0,-20} {1}" -f $k, $ok) }
Write-Host ""
if ($allOk) { Write-Host ("DONE. Bundle OK at " + $Dest + "  db_sha256=" + $dbHash) -ForegroundColor Green }
else        { Write-Host "INCOMPLETE - some pieces missing above. Re-run." -ForegroundColor Red }
