# One-shot elevated restart of the Automatix :3500 server.
# Logs every step to logs\restart-clean.log so a non-elevated caller can read
# the outcome. NO Read-Host (won't hang), verifies the old PID is really gone
# before starting, and confirms the NEW pid owns :3500 (not a stale 200 from
# the old process). Leaves cloudflared untouched.
$ErrorActionPreference = 'Continue'
$root    = Split-Path -Parent $PSScriptRoot
$nodeJs  = Join-Path $root 'dist-server\server\index.js'
$logDir  = Join-Path $root 'logs'
$nodeLog = Join-Path $logDir 'node-server.log'
$pidFile = Join-Path $logDir 'automatix.pids.json'
$out     = Join-Path $logDir 'restart-clean.log'

function L($m) { "$([DateTime]::Now.ToString('HH:mm:ss')) $m" | Out-File -FilePath $out -Append -Encoding utf8 }

"" | Out-File -FilePath $out -Encoding utf8   # truncate
L "=== restart-clean start (elevated pid $PID) ==="

if (-not (Test-Path $nodeJs)) { L "MISSING BUILD: $nodeJs"; exit 1 }

# 1. Stop whatever listens on :3500, then wait until the port is actually free.
$old = Get-NetTCPConnection -LocalPort 3500 -State Listen -ErrorAction SilentlyContinue | Select-Object -Expand OwningProcess -Unique
foreach ($procId in $old) {
  try { Stop-Process -Id $procId -Force -ErrorAction Stop; L "stopped old pid $procId" }
  catch { L "FAILED to stop pid ${procId}: $($_.Exception.Message)" }
}
$free = $false
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Milliseconds 800
  if (-not (Get-NetTCPConnection -LocalPort 3500 -State Listen -ErrorAction SilentlyContinue)) { $free = $true; break }
}
L "port 3500 free: $free"
if (-not $free) { L "ABORT: port still held, not starting a second instance"; exit 2 }

# 2. Start the new server with the public-CORS + proxy env.
$env:PROMIX_TRUST_PROXY     = '1'
$env:PROMIX_ALLOWED_ORIGINS = 'https://automatix.online,https://www.automatix.online,https://app.automatix.online'
$env:PROMIX_LANDING_HOSTS   = 'automatix.online,www.automatix.online'
# $env:PROMIX_LICENSE_GATE  = '1'   # enable once the firm's license is imported
$env:NODE_OPTIONS           = '--max-old-space-size=8192'
$p = Start-Process -FilePath 'node' -ArgumentList ('"' + $nodeJs + '"') `
       -WorkingDirectory $root -WindowStyle Hidden `
       -RedirectStandardOutput $nodeLog -RedirectStandardError "$nodeLog.err" -PassThru
L "started new node pid $($p.Id)"

# 3. Confirm the NEW pid owns :3500 and answers health.
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 1000
  if ($p.HasExited) { L "NEW node EXITED early (code $($p.ExitCode)) — see node-server.log.err"; break }
  $owner = Get-NetTCPConnection -LocalPort 3500 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -Expand OwningProcess
  if ($owner -eq $p.Id) {
    try { if ((Invoke-WebRequest 'http://127.0.0.1:3500/api/health' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { $ok = $true; break } } catch {}
  }
}
L "health OK (new pid owns 3500): $ok"

# 4. Keep PID file accurate (preserve cloudflared).
$cf = $null
if (Test-Path $pidFile) { try { $cf = (Get-Content $pidFile -Raw | ConvertFrom-Json).cloudflared } catch {} }
[PSCustomObject]@{ node = $p.Id; cloudflared = $cf; started_at = ([DateTime]::Now.ToString('o')) } | ConvertTo-Json | Set-Content -Path $pidFile -Encoding utf8
L "=== restart-clean done (new pid $($p.Id), ok=$ok) ==="
