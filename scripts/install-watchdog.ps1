# install-watchdog.ps1 - register the Automatix health watchdog as a Scheduled
# Task that runs every 2 minutes as SYSTEM. Re-run to update. Run from an elevated
# PowerShell:  powershell -ExecutionPolicy Bypass -File scripts\install-watchdog.ps1
#
# Before relying on alerts, set the channel(s) as MACHINE env vars so the SYSTEM
# task can read them, e.g. (elevated):
#   setx /M PROMIX_ALERT_TELEGRAM_TOKEN "123456:ABC..."
#   setx /M PROMIX_ALERT_TELEGRAM_CHAT  "987654321"
#   # or a generic webhook (Slack/Discord/ntfy):
#   setx /M PROMIX_ALERT_WEBHOOK "https://hooks.slack.com/services/..."
# Test once manually:  powershell -ExecutionPolicy Bypass -File scripts\watchdog.ps1

$ErrorActionPreference = 'Stop'
$Watchdog = Join-Path $PSScriptRoot 'watchdog.ps1'
$TaskName = 'AutomatixWatchdog'

if (-not (Test-Path $Watchdog)) { Write-Error "watchdog.ps1 not found at $Watchdog"; exit 1 }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $Watchdog)

# Fire shortly after boot, then repeat every 2 minutes effectively forever.
$trigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(1)) `
  -RepetitionInterval (New-TimeSpan -Minutes 2) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "Registered scheduled task '$TaskName' - runs watchdog.ps1 every 2 minutes as SYSTEM." -ForegroundColor Green
Write-Host "Logs: logs\watchdog.log   State: logs\watchdog-state.json" -ForegroundColor DarkGray
Write-Host "Set PROMIX_ALERT_TELEGRAM_TOKEN/_CHAT or PROMIX_ALERT_WEBHOOK (machine env) to get downtime alerts." -ForegroundColor DarkGray
