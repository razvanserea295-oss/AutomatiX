@echo off
title Automatix - Restart Server
:: One-click restart of the Automatix node server (:3500) with the latest build.
:: Self-elevates (UAC), then runs scripts\restart-server.ps1. The cloudflared
:: tunnel is left running. Use after a code update so new IPC commands register.
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-server.ps1"
