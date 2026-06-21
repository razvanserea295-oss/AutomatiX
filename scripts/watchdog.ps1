# watchdog.ps1 - external health watchdog for Automatix.
#
# Run every ~2 minutes from Task Scheduler (see install-watchdog.ps1). It probes
# the LOCAL /api/health and:
#   - healthy (200)            -> clears state; sends a one-time "recovered" alert.
#   - degraded (e.g. 503)      -> process up but DB unreachable -> ALERT only (never
#                                auto-restarts - that could lose data / not help).
#   - unresponsive (listening  -> ALERT only; does NOT kill a possibly-flushing
#     but no health reply)        process.
#   - genuinely down (nothing  -> RELAUNCH via automatix-launcher.ps1 + ALERT.
#     listening on the port)
#
# This composes safely with the app's own restart_server handoff: during a normal
# restart the port stays listening (or comes back within seconds), so the watchdog
# never relaunches mid-handoff. Alerts de-dupe on state transitions (no spam).
#
# Alert channels (optional, set as MACHINE env vars so the SYSTEM task sees them):
#   PROMIX_ALERT_TELEGRAM_TOKEN + PROMIX_ALERT_TELEGRAM_CHAT   (Telegram bot)
#   PROMIX_ALERT_WEBHOOK                                       (generic JSON POST: Slack/Discord/ntfy)
# With none set, events are still written to logs\watchdog.log.

param(
  [int]$Port = 3500,
  [string]$PublicUrl = 'https://automatix.online/api/health'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectRoot 'logs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$StateFile = Join-Path $LogDir 'watchdog-state.json'
$WdLog = Join-Path $LogDir 'watchdog.log'
$Launcher = Join-Path $PSScriptRoot 'automatix-launcher.ps1'
$Host7 = [System.Net.Dns]::GetHostName()

function Wlog([string]$m) {
  try { Add-Content -Path $WdLog -Value ("{0}  {1}" -f (Get-Date -Format 'o'), $m) } catch {}
  try {
    $li = Get-Item $WdLog -ErrorAction SilentlyContinue
    if ($li -and $li.Length -gt 2MB) { $tail = Get-Content $WdLog -Tail 500; Set-Content -Path $WdLog -Value $tail }
  } catch {}
}

function Load-State {
  if (Test-Path $StateFile) { try { return Get-Content $StateFile -Raw | ConvertFrom-Json } catch {} }
  return [PSCustomObject]@{ status = 'unknown'; tunnel = 'unknown'; since = (Get-Date -Format 'o') }
}
function Save-State($s) { try { $s | ConvertTo-Json | Set-Content -Path $StateFile -Encoding UTF8 } catch {} }

function Send-Alert([string]$text) {
  Wlog "ALERT: $text"
  $tgToken = $env:PROMIX_ALERT_TELEGRAM_TOKEN; $tgChat = $env:PROMIX_ALERT_TELEGRAM_CHAT
  if ($tgToken -and $tgChat) {
    try { Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$tgToken/sendMessage" -Body @{ chat_id = $tgChat; text = $text } -TimeoutSec 10 | Out-Null }
    catch { Wlog "telegram alert failed: $_" }
  }
  $hook = $env:PROMIX_ALERT_WEBHOOK
  if ($hook) {
    try { Invoke-RestMethod -Method Post -Uri $hook -ContentType 'application/json' -Body (@{ text = $text; content = $text } | ConvertTo-Json) -TimeoutSec 10 | Out-Null }
    catch { Wlog "webhook alert failed: $_" }
  }
}

function Probe([string]$Url) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    return @{ reachable = $true; code = [int]$r.StatusCode }
  } catch {
    $code = 0
    try { if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode } } catch {}
    return @{ reachable = ($code -ne 0); code = $code }
  }
}
function Port-Listening([int]$P) {
  return ((Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0)
}

# ---------------- main ----------------
$state = Load-State
$p = Probe ("http://127.0.0.1:{0}/api/health" -f $Port)

$healthy  = ($p.reachable -and $p.code -eq 200)
$degraded = ($p.reachable -and $p.code -ne 200)
$newStatus = if ($healthy) { 'ok' } elseif ($degraded) { 'degraded' } else { 'down' }

if ($healthy) {
  if ($state.status -eq 'down' -or $state.status -eq 'degraded') {
    Send-Alert ("OK  Automatix RECOVERED on {0} - /api/health 200 on :{1}." -f $Host7, $Port)
  }
  Wlog 'ok (200)'
}
elseif ($degraded) {
  if ($state.status -ne 'degraded') {
    Send-Alert ("WARN  Automatix DEGRADED on {0} - /api/health returned {1} on :{2}. DB likely unreachable. NOT auto-restarted (avoids data loss) - please check." -f $Host7, $p.code, $Port)
  }
  Wlog ("degraded ({0})" -f $p.code)
}
else {
  if (Port-Listening $Port) {
    if ($state.status -ne 'down') {
      Send-Alert ("WARN  Automatix NOT RESPONDING on {0} - :{1} is listening but /api/health timed out. Hung process; not auto-killed. Please check." -f $Host7, $Port)
    }
    Wlog 'hung (listening, no health reply)'
  }
  else {
    Send-Alert ("DOWN  Automatix is DOWN on {0} - nothing listening on :{1}. Relaunching..." -f $Host7, $Port)
    Wlog 'DOWN - relaunching via launcher'
    try {
      Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $Launcher) -WindowStyle Hidden
      Wlog 'launcher invoked'
    }
    catch { Wlog "relaunch failed: $_"; Send-Alert ("FAIL  Automatix relaunch FAILED on {0}: {1}" -f $Host7, $_) }
  }
}

# Tunnel probe (alert-only; app stays up locally even if the public URL is down).
$tunnel = $state.tunnel
if ($healthy -and $PublicUrl) {
  $pr = Probe $PublicUrl
  if ($pr.reachable -and $pr.code -eq 200) {
    if ($state.tunnel -eq 'down') { Send-Alert ("OK  Automatix tunnel RECOVERED - {0} reachable." -f $PublicUrl) }
    $tunnel = 'ok'
  }
  else {
    if ($state.tunnel -ne 'down') { Send-Alert ("WARN  Automatix TUNNEL issue - app is up locally but {0} is unreachable/HTTP {1}." -f $PublicUrl, $pr.code) }
    $tunnel = 'down'
  }
}

$since = if ($state.status -eq $newStatus) { $state.since } else { (Get-Date -Format 'o') }
Save-State ([PSCustomObject]@{ status = $newStatus; tunnel = $tunnel; since = $since; last = (Get-Date -Format 'o') })
