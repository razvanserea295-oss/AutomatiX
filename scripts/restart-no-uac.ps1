<#
  restart-no-uac.ps1 - restart the Automatix server WITHOUT a UAC prompt.

  How it works (no elevation needed):
    1. Reads the 'aiservice' admin credentials from ai-service/config.toml.
    2. Logs in over LOOPBACK (127.0.0.1) - loopback requests carry no browser
       Origin header, so they bypass CORS even if the allowlist is misconfigured.
    3. Calls the admin-only 'restart_server' IPC command. The currently running
       (possibly elevated) server spawns its own replacement, INHERITING its
       token - so the new process keeps the same privileges with no UAC dialog.

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts\restart-no-uac.ps1
    powershell -ExecutionPolicy Bypass -File scripts\restart-no-uac.ps1 -DryRun
#>
param(
  [int]$Port = 3500,
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$cfgPath = Join-Path $root 'ai-service\config.toml'
if (-not (Test-Path $cfgPath)) { Write-Error "config.toml not found at $cfgPath"; exit 1 }
$cfg = Get-Content $cfgPath -Raw
$user = ([regex]'service_username\s*=\s*"([^"]+)"').Match($cfg).Groups[1].Value
$pass = ([regex]'service_password\s*=\s*"([^"]+)"').Match($cfg).Groups[1].Value
if (-not $user -or -not $pass) { Write-Error 'could not parse aiservice credentials from config.toml'; exit 1 }

$base = "http://127.0.0.1:$Port"
try {
  $login = Invoke-RestMethod "$base/api/cmd/login" -Method POST -ContentType 'application/json' -Body (@{ username = $user; password = $pass } | ConvertTo-Json) -TimeoutSec 8
} catch {
  Write-Error "login as '$user' failed: $($_.Exception.Message)"; exit 1
}
if (-not $login.token) { Write-Error 'login returned no token (2FA enabled, or password changed in DB?)'; exit 1 }
if ($login.user.role_name -ne 'admin') { Write-Error "'$user' is not admin (role=$($login.user.role_name))"; exit 1 }
Write-Host "[restart-no-uac] authenticated as $user (admin) OK"

if ($DryRun) { Write-Host '[restart-no-uac] -DryRun: auth path works; not restarting.'; exit 0 }

$before = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
Invoke-RestMethod "$base/api/cmd/restart_server" -Method POST -ContentType 'application/json' -Body '{}' -Headers @{ Authorization = "Bearer $($login.token)" } -TimeoutSec 8 | Out-Null
Write-Host "[restart-no-uac] restart requested (old pid $before); waiting for respawn..."
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 1
  $lp = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
  if ($lp -and $lp -ne $before) {
    try {
      $h = Invoke-RestMethod "$base/api/health" -TimeoutSec 2
      if ($h.status -eq 'ok') {
        Write-Host "[restart-no-uac] OK - new pid $lp, health ok"
        exit 0
      }
    } catch { }
  }
}
Write-Error '[restart-no-uac] server did not come back within 15s - check logs\node-server.log'
exit 1
