@echo off
:: ============================================================
::  Automatix - stop all running services
:: ============================================================

setlocal
cd /d "%~dp0"

title Automatix Stop

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass ^
  -File "%~dp0scripts\automatix-stopper.ps1"

endlocal
