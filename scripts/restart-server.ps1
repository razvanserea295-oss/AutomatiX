# Restart ONLY the Automatix node server (:3500) with the current dist-server
# build. Leaves the cloudflared tunnel running. Must run elevated — the
# bundled Restart-Server.cmd self-elevates and calls this.
$ErrorActionPreference = 'Continue'
$root    = Split-Path -Parent $PSScriptRoot
$nodeJs  = Join-Path $root 'dist-server\server\index.js'
$logDir  = Join-Path $root 'logs'
$nodeLog = Join-Path $logDir 'node-server.log'
$pidFile = Join-Path $logDir 'automatix.pids.json'

Write-Host ''
Write-Host '=== Automatix - repornire server (:3500) ===' -ForegroundColor Cyan

if (-not (Test-Path $nodeJs)) {
  Write-Host "Lipseste build-ul backend: $nodeJs" -ForegroundColor Red
  Write-Host "Ruleaza intai:  npx tsc -p tsconfig.server.json" -ForegroundColor Yellow
  Read-Host 'Enter pentru a inchide'; exit 1
}

# Stop whatever currently holds :3500 (elevated → can kill the running server).
$stopped = $false
Get-NetTCPConnection -LocalPort 3500 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop
    Write-Host "  oprit serverul vechi (pid $($_.OwningProcess))" -ForegroundColor DarkGray
    $stopped = $true
  } catch {
    Write-Host "  nu am putut opri pid $($_.OwningProcess): $($_.Exception.Message)" -ForegroundColor Red
  }
}
if ($stopped) { Start-Sleep -Seconds 2 }

# Start fresh (same env as the launcher).
$env:PROMIX_TRUST_PROXY = '1'
# Public site rides the cloudflared tunnel; without this the strict CORS
# policy rejects every API POST coming from the browser (Origin header).
$env:PROMIX_ALLOWED_ORIGINS = 'https://automatix.online'
$env:NODE_OPTIONS = '--max-old-space-size=8192'
$p = Start-Process -FilePath 'node' -ArgumentList ('"' + $nodeJs + '"') `
       -WorkingDirectory $root -WindowStyle Hidden `
       -RedirectStandardOutput $nodeLog -RedirectStandardError "$nodeLog.err" -PassThru
Write-Host "  pornit serverul nou (pid $($p.Id))" -ForegroundColor DarkGray

$ok = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 1000
  try { if ((Invoke-WebRequest 'http://127.0.0.1:3500/api/health' -UseBasicParsing -TimeoutSec 1).StatusCode -eq 200) { $ok = $true; break } } catch {}
  if ($p.HasExited) { break }
}

# Keep the PID file accurate so Stop-Automatix.cmd still works.
$cf = $null
if (Test-Path $pidFile) { try { $cf = (Get-Content $pidFile -Raw | ConvertFrom-Json).cloudflared } catch {} }
[PSCustomObject]@{ node = $p.Id; cloudflared = $cf; started_at = (Get-Date -Format 'o') } | ConvertTo-Json | Set-Content -Path $pidFile -Encoding UTF8

Write-Host ''
if ($ok) {
  Write-Host '  OK - http://localhost:3500 raspunde cu build-ul nou.' -ForegroundColor Green
  Write-Host '  Acum: Ctrl+F5 in browser.' -ForegroundColor Green
} else {
  Write-Host '  [!] Serverul nu raspunde dupa 30s - vezi logs\node-server.log.err' -ForegroundColor Yellow
}
Write-Host ''
Read-Host 'Enter pentru a inchide'
