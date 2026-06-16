# automatix-launcher.ps1
#
# One-shot starter: spawns node + cloudflared as DETACHED processes,
# waits for each to be reachable, prints status, then exits. Services
# keep running even after this script and its window close.
#
# AI service REMOVED — it caused instability (crashes, RAM pressure,
# couldn't read the encrypted DB). The app runs fully without it; the
# AI chat page simply reports the service is unavailable.
#
# To stop everything later, run Stop-Automatix.cmd.

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$NodeServerJs = Join-Path $ProjectRoot 'dist-server\server\index.js'
$CloudflaredExe = 'C:\cloudflared\cloudflared.exe'
$CloudflaredCfg = 'C:\cloudflared\config.yml'

$LogDir = Join-Path $ProjectRoot 'logs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$NodeLog     = Join-Path $LogDir 'node-server.log'
$CloudfLog   = Join-Path $LogDir 'cloudflared.log'
$PidFile     = Join-Path $LogDir 'automatix.pids.json'

Clear-Host
Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '         A U T O M A T I X   S T A R T        ' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''

# -------------------------------------------------------------------------
# Pre-flight checks
# -------------------------------------------------------------------------
$missing = @()
if (-not (Test-Path $NodeServerJs))   { $missing += "Node server:  $NodeServerJs (run: npx tsc -p tsconfig.server.json)" }
if (-not (Test-Path $CloudflaredExe)) { $missing += "Cloudflared:  $CloudflaredExe" }
if (-not (Test-Path $CloudflaredCfg)) { $missing += "Tunnel cfg:   $CloudflaredCfg" }

if ($missing.Count -gt 0) {
  Write-Host 'Lipsesc dependente:' -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
  Write-Host ''
  Read-Host 'Apasa Enter ca sa inchizi'
  exit 1
}

# -------------------------------------------------------------------------
# Stop anything running from a previous launch (incl. any stray ai-service).
# -------------------------------------------------------------------------
function Stop-IfRunning {
  param([string]$Name, [int]$Port)
  $stopped = $false
  if ($Port) {
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
             Where-Object { $_.State -eq 'Listen' }
    foreach ($c in $conns) {
      try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; $stopped = $true } catch {}
    }
  }
  if ($Name) {
    $procs = Get-Process -Name $Name -ErrorAction SilentlyContinue
    foreach ($p in $procs) {
      try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue; $stopped = $true } catch {}
    }
  }
  return $stopped
}

Write-Host '[1/3] Curat instante anterioare...' -ForegroundColor Yellow
$killed = $false
if (Stop-IfRunning -Port 3500)              { Write-Host '       - node :3500 oprit' -ForegroundColor DarkGray; $killed = $true }
if (Stop-IfRunning -Name 'ai-service')      { Write-Host '       - ai-service (vechi) oprit' -ForegroundColor DarkGray; $killed = $true }
if (Stop-IfRunning -Name 'cloudflared')     { Write-Host '       - cloudflared oprit' -ForegroundColor DarkGray; $killed = $true }
if ($killed) { Start-Sleep -Seconds 2 }
Write-Host '       OK' -ForegroundColor Green
Write-Host ''

# -------------------------------------------------------------------------
# Start node server.
# -------------------------------------------------------------------------
Write-Host '[2/3] Pornesc node server :3500...' -ForegroundColor Yellow
$env:PROMIX_TRUST_PROXY = '1'
# Public site rides the cloudflared tunnel; without this the strict CORS
# policy rejects every API POST coming from the browser (Origin header).
$env:PROMIX_ALLOWED_ORIGINS = 'https://automatix.online'
# 8 GB heap — generous for the migrated DB (now ~28 MB) plus upload buffers.
$env:NODE_OPTIONS = '--max-old-space-size=8192'
$quotedNodeJs = '"' + $NodeServerJs + '"'
$nodeProc = Start-Process -FilePath 'node' `
                          -ArgumentList $quotedNodeJs `
                          -WorkingDirectory $ProjectRoot `
                          -WindowStyle Hidden `
                          -RedirectStandardOutput $NodeLog `
                          -RedirectStandardError "$NodeLog.err" `
                          -PassThru
Write-Host "       PID $($nodeProc.Id)" -ForegroundColor DarkGray

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 1000
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3500/api/health' -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
  if ($nodeProc.HasExited) { break }
}
if ($ready) { Write-Host '       OK - http://localhost:3500' -ForegroundColor Green }
elseif ($nodeProc.HasExited) { Write-Host "       [!] Serverul a murit. Vezi $NodeLog.err" -ForegroundColor Red }
else { Write-Host '       [!] Serverul nu raspunde dupa 30s. Vezi logs/node-server.log' -ForegroundColor Yellow }
Write-Host ''

# -------------------------------------------------------------------------
# Start cloudflared.
# -------------------------------------------------------------------------
Write-Host '[3/3] Pornesc tunelul cloudflared...' -ForegroundColor Yellow
$tunProc = Start-Process -FilePath $CloudflaredExe `
                         -ArgumentList @('tunnel', '--config', $CloudflaredCfg, 'run') `
                         -WindowStyle Hidden `
                         -RedirectStandardOutput $CloudfLog `
                         -RedirectStandardError "$CloudfLog.err" `
                         -PassThru
Write-Host "       PID $($tunProc.Id)" -ForegroundColor DarkGray

Start-Sleep -Seconds 4
$tunnelOk = $false
try {
  $r = Invoke-WebRequest -Uri 'https://automatix.online/api/health' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
  if ($r.StatusCode -eq 200) { $tunnelOk = $true }
} catch {}
if ($tunnelOk) { Write-Host '       OK - https://automatix.online raspunde' -ForegroundColor Green }
else           { Write-Host '       Tunelul porneste (poate ia ~10s sa se inregistreze)' -ForegroundColor Yellow }
Write-Host ''

# -------------------------------------------------------------------------
# Persist PIDs so Stop-Automatix.cmd can find them later.
# -------------------------------------------------------------------------
$pidsObj = [PSCustomObject]@{
  node        = $nodeProc.Id
  cloudflared = $tunProc.Id
  started_at  = (Get-Date -Format 'o')
}
$pidsObj | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8

Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '  SERVICIILE PORNITE (fara AI)' -ForegroundColor Green
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '  Local LAN   : ' -NoNewline; Write-Host 'http://localhost:3500'    -ForegroundColor White
Write-Host '  Public HTTPS: ' -NoNewline; Write-Host 'https://automatix.online' -ForegroundColor White
Write-Host ''
Write-Host '  Logs    : ' -NoNewline; Write-Host $LogDir -ForegroundColor White
Write-Host '  Stop    : ' -NoNewline; Write-Host 'Stop-Automatix.cmd' -ForegroundColor White
Write-Host ''
Write-Host '  Serviciile vor continua sa ruleze dupa ce inchizi aceasta fereastra.' -ForegroundColor DarkGray
Write-Host ''
Start-Sleep -Seconds 2
