# Enable RustDesk access from the internet via Cloudflare Tunnel TCP.
# Updates C:\cloudflared\config.yml, DNS routes, .env, bundle, and restarts services.
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$TUNNEL_ID = 'eb0fd8b3-d530-49d4-9ad0-1f56f3f9c538'
$CLOUDFLARED = 'C:\cloudflared\cloudflared.exe'
$CFG = 'C:\cloudflared\config.yml'
$ID_HOST = 'id.automatix.online'
$RELAY_HOST = 'relay.automatix.online'

Set-Location $ROOT

if (-not (Test-Path $CLOUDFLARED)) { throw "cloudflared not found at $CLOUDFLARED" }
if (-not (Test-Path $CFG)) { throw "tunnel config not found at $CFG" }

Write-Host "[rustdesk-public] Ensuring DNS routes for $ID_HOST and $RELAY_HOST..."
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $CLOUDFLARED tunnel route dns $TUNNEL_ID $ID_HOST 2>&1 | ForEach-Object { Write-Host "  $_" }
& $CLOUDFLARED tunnel route dns $TUNNEL_ID $RELAY_HOST 2>&1 | ForEach-Object { Write-Host "  $_" }
$ErrorActionPreference = $prevEap

Write-Host "[rustdesk-public] Updating .env (public hostnames)..."
node scripts/setup-rustdesk-env.mjs --public

Write-Host "[rustdesk-public] Regenerating QuickSupport bundle..."
npm run support:prepare-bundle

Write-Host "[rustdesk-public] Restarting cloudflared..."
Get-Process -Name cloudflared -ErrorAction SilentlyContinue | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {}
}
Start-Sleep -Seconds 2
$logDir = Join-Path $ROOT 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
Start-Process -FilePath $CLOUDFLARED -ArgumentList 'tunnel','--config',$CFG,'run' -WorkingDirectory (Split-Path $CFG) `
  -RedirectStandardOutput (Join-Path $logDir 'cloudflared.log') `
  -RedirectStandardError (Join-Path $logDir 'cloudflared.log.err') `
  -WindowStyle Hidden
Start-Sleep -Seconds 3

Write-Host "[rustdesk-public] Restarting Automatix server..."
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'restart-no-uac.ps1')

Write-Host "[rustdesk-public] Done."
Write-Host "  Clients (internet): $ID_HOST`:21116 / $RELAY_HOST`:21117"
Write-Host "  Viewer (browser):   wss://app.automatix.online/ws/id"
