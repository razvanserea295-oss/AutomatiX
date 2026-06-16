@echo off
:: ============================================================================
:: reset-and-start.cmd
::
:: One-click fix when the server doesn't boot. Does:
::   1. Self-elevate to Administrator (UAC prompt)
::   2. Kill ALL Automatix processes (node / ai-service / cloudflared zombies)
::   3. Re-install the scheduled task + registry backup
::   4. Start the server
::
:: How to use: right-click this file → "Run as administrator"
:: (Or double-click — Windows will prompt for UAC.)
:: ============================================================================

:: Self-elevate via UAC if we're not admin yet
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Cer drepturi de administrator (UAC)...
    powershell -NoProfile -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ===============================================================
echo   Automatix - Reset si Pornire
echo ===============================================================
echo.

set "ROOT=%~dp0.."
set "INSTALLER=%~dp0install-autostart.ps1"

echo [1/4] Omor toate procesele zombi...
powershell -NoProfile -Command "Get-Process -Name node,cloudflared,ai-service -ErrorAction SilentlyContinue | Stop-Process -Force"
timeout /t 3 /nobreak >nul
echo       OK
echo.

echo [2/4] Reinregistrez scheduled task + registry backup...
powershell -NoProfile -ExecutionPolicy Bypass -File "%INSTALLER%"
echo.

echo [3/4] Pornesc serverul prin scheduled task...
powershell -NoProfile -Command "Start-ScheduledTask -TaskName 'Automatix Server Autostart'"
echo       Astept 60 secunde sa se ridice (modelul AI dureaza ~10s la load)...
timeout /t 60 /nobreak >nul
echo.

echo [4/4] Verific...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest 'http://127.0.0.1:3500/api/health' -UseBasicParsing -TimeoutSec 15; Write-Host '   Server PROMIX: OK' -ForegroundColor Green } catch { Write-Host ('   Server PROMIX: FAIL - ' + $_.Exception.Message) -ForegroundColor Red }"
powershell -NoProfile -Command "try { $r = Invoke-WebRequest 'http://127.0.0.1:8100/health' -UseBasicParsing -TimeoutSec 15; Write-Host '   AI service:    OK' -ForegroundColor Green } catch { Write-Host ('   AI service:    FAIL - ' + $_.Exception.Message) -ForegroundColor Red }"
echo.

echo ===============================================================
echo   Gata. Deschide automatix.online in browser (Ctrl+Shift+R).
echo ===============================================================
echo.
pause
