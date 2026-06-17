@echo off
:: ============================================================
::  Automatix — single-click launcher
::  Starts ai-service, node server and cloudflared tunnel.
::  Press Q in the launcher window to stop everything.
:: ============================================================

setlocal
cd /d "%~dp0"

title Automatix Launcher

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass ^
  -File "%~dp0scripts\automatix-launcher.ps1"

if errorlevel 1 (
  echo.
  echo Launcher iesit cu eroare. Apasa Enter sa inchizi.
  pause >nul
)

endlocal
