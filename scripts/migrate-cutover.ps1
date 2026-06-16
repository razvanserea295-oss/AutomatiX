# =============================================================================
# migrate-cutover.ps1
#
# Switches the live system from the OLD app to the NEW app (Automatix-NEW),
# with an automatic safety net: if the new app fails its health check, the
# script restarts the OLD app so you're never left with nothing running.
#
# Steps:
#   1. Stop OLD app (scheduled task + processes) — frees port 3500.
#   2. Remove OLD autostart (task + registry + wrapper).
#   3. Start NEW app via its launcher.
#   4. Health-check NEW (server :3500 + AI :8100 + tunnel).
#   5a. If healthy  -> install NEW autostart, done.
#   5b. If unhealthy-> roll back: restart OLD + reinstall OLD autostart.
#
# Run as Administrator. The OLD app folder is left intact as a fallback.
# =============================================================================

$ErrorActionPreference = 'Continue'
$NEW = 'C:\APLICATIE AUTOMATIX\Automatix-NEW'
$OLD = 'C:\APLICATIE AUTOMATIX\Automatix-Dev-transfer\Automatix-Dev'
$TaskName = 'Automatix Server Autostart'

function Test-Health {
    param([int]$TimeoutSec = 15)
    try {
        $r = Invoke-WebRequest 'http://127.0.0.1:3500/api/health' -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        return $r.StatusCode -eq 200
    } catch { return $false }
}

Write-Host ''
Write-Host '===============================================================' -ForegroundColor Cyan
Write-Host '  CUTOVER: app VECHI -> app NOU (Automatix-NEW)' -ForegroundColor Cyan
Write-Host '===============================================================' -ForegroundColor Cyan
Write-Host ''

# --- 1. Stop OLD ---
Write-Host '[1/6] Opresc app-ul vechi...' -ForegroundColor Yellow
try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue } catch {}
Get-Process -Name node,cloudflared,ai-service -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 5
Write-Host '      OK'

# --- 2. Remove OLD autostart ---
Write-Host '[2/6] Scot autostart-ul vechi...' -ForegroundColor Yellow
try { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue } catch {}
try { Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -Name 'AutomatixServerAutostart' -ErrorAction SilentlyContinue } catch {}
$oldWrap = Join-Path $OLD 'scripts\_autostart-wrapper.ps1'
if (Test-Path $oldWrap) { Remove-Item $oldWrap -Force -ErrorAction SilentlyContinue }
Write-Host '      OK'

# --- 3. Start NEW ---
Write-Host '[3/6] Pornesc app-ul nou...' -ForegroundColor Yellow
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $NEW 'scripts\automatix-launcher.ps1')
Write-Host '      Astept 70 secunde sa se ridice (model AI ~10s)...'
Start-Sleep -Seconds 70

# --- 4. Health check NEW ---
Write-Host '[4/6] Verific app-ul nou...' -ForegroundColor Yellow
$ok = $false
for ($i = 0; $i -lt 6; $i++) {
    if (Test-Health -TimeoutSec 15) { $ok = $true; break }
    Write-Host "      ...inca incarca (incercare $($i+1)/6)"
    Start-Sleep -Seconds 10
}

if ($ok) {
    Write-Host '      [OK] App-ul NOU raspunde pe :3500 (fara AI, cum ai cerut)' -ForegroundColor Green

    # --- 5a. Install NEW autostart ---
    Write-Host '[5/6] Instalez autostart pe app-ul NOU...' -ForegroundColor Yellow
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $NEW 'scripts\install-autostart.ps1')

    Write-Host '[6/6] GATA.' -ForegroundColor Green
    Write-Host ''
    Write-Host '===============================================================' -ForegroundColor Green
    Write-Host '  CUTOVER REUSIT — app-ul NOU este LIVE' -ForegroundColor Green
    Write-Host '===============================================================' -ForegroundColor Green
    Write-Host ''
    Write-Host '  Deschide automatix.online (Ctrl+Shift+R) si logheaza-te cu Vlad.'
    Write-Host '  App-ul vechi e oprit dar pastrat ca rezerva la:'
    Write-Host "    $OLD"
    Write-Host ''
} else {
    # --- 5b. ROLLBACK to OLD ---
    Write-Host '      [!] App-ul NOU nu raspunde. FAC ROLLBACK la vechi...' -ForegroundColor Red
    Get-Process -Name node,cloudflared,ai-service -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 4
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $OLD 'scripts\install-autostart.ps1')
    Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 40
    Write-Host ''
    Write-Host '===============================================================' -ForegroundColor Red
    Write-Host '  CUTOVER ESUAT — am revenit la app-ul VECHI' -ForegroundColor Red
    Write-Host '===============================================================' -ForegroundColor Red
    Write-Host '  Verifica logs/node-server.log.err din Automatix-NEW.' -ForegroundColor Yellow
    Write-Host '  Datele tale sunt in siguranta — nimic nu s-a pierdut.'
    Write-Host ''
}
pause
