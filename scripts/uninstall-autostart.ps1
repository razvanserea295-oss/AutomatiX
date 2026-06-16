# =============================================================================
# uninstall-autostart.ps1
#
# Removes the "Automatix Server Autostart" scheduled task created by
# install-autostart.ps1. Does NOT stop the currently running server —
# only prevents it from auto-starting on the next boot. To stop the
# running server too, use Stop-Process on the PIDs in logs/automatix.pids.json
# or just reboot after uninstalling.
# =============================================================================

$ErrorActionPreference = 'Stop'
$TaskName    = 'Automatix Server Autostart'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$WrapperPs1  = Join-Path $ProjectRoot 'scripts\_autostart-wrapper.ps1'

$me = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $me.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host '[!] Acest script trebuie rulat ca Administrator. Reincerc cu UAC...' -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath
    )
    exit 0
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[ok] Task-ul '$TaskName' a fost sters." -ForegroundColor Green
} else {
    Write-Host "[!] Task-ul '$TaskName' nu este inregistrat — nimic de sters." -ForegroundColor Yellow
}

if (Test-Path $WrapperPs1) {
    Remove-Item $WrapperPs1 -Force
    Write-Host "[ok] Wrapper generat sters: $WrapperPs1" -ForegroundColor Green
}

# Also remove the HKLM Run key backup that install-autostart.ps1 sets up
# as a feature-update-resilient fallback.
$runKeyPath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'
$runKeyName = 'AutomatixServerAutostart'
if (Get-ItemProperty -Path $runKeyPath -Name $runKeyName -ErrorAction SilentlyContinue) {
    Remove-ItemProperty -Path $runKeyPath -Name $runKeyName -Force
    Write-Host "[ok] Backup registry sters: ${runKeyPath}\${runKeyName}" -ForegroundColor Green
}

Write-Host ''
Write-Host 'NU am oprit serverul in functiune. Daca vrei sa-l opresti acum:' -ForegroundColor Yellow
Write-Host '  & "$PSScriptRoot\automatix-stopper.ps1"'
Write-Host ''
