@echo off
title Automatix - Pornire server
:: ============================================================================
::  Porneste / reporneste serverul Automatix (node :3500 + tunel cloudflared).
::  Se auto-elevateaza (cere drepturi de administrator) ca sa poata opri o
::  instanta veche pornita ca admin, apoi porneste din codul nou (dist-server).
::
::  E tinta scurtaturii "Porneste Server Automatix" de pe Desktop.
:: ============================================================================

net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Cer drepturi de administrator...
    powershell -NoProfile -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ===============================================================
echo   Pornesc serverul Automatix...
echo ===============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0automatix-launcher.ps1"

echo.
echo Daca scrie "OK - http://localhost:3500" mai sus, serverul a pornit.
echo Deschide automatix.online si testeaza (Ctrl+Shift+R intai).
echo.
pause
