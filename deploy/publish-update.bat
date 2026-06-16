@echo off
title Promix — Publicare Update
color 0A

echo ============================================
echo   PROMIX AUTOMATIX — Publicare Update
echo ============================================
echo.

:: Config
set UPDATES_DIR=C:\PromixData\updates
set BUILD_DIR=C:\promix-build-cache\target\release\bundle
set CONF=%~dp0..\src-tauri\tauri.conf.json

:: Extract version from tauri.conf.json
for /f "tokens=2 delims=:, " %%a in ('findstr /c:"\"version\"" "%CONF%"') do set RAW_VER=%%a
set VERSION=%RAW_VER:"=%
echo   Versiune: %VERSION%

:: Find MSI
set MSI_FILE=
for %%f in ("%BUILD_DIR%\msi\*.msi") do (
    if not "%%~xf"==".zip" set MSI_FILE=%%f
)
if "%MSI_FILE%"=="" (
    echo [EROARE] Nu gasesc MSI in %BUILD_DIR%\msi\
    echo Ruleaza: npx tauri build --bundles msi
    pause
    exit /b 1
)
echo   MSI: %MSI_FILE%

:: Find signature
set SIG_FILE=
for %%f in ("%BUILD_DIR%\msi\*.msi.sig") do set SIG_FILE=%%f
if "%SIG_FILE%"=="" (
    echo [EROARE] Nu gasesc semnatura .msi.sig — rebuild cu TAURI_SIGNING_PRIVATE_KEY setat
    pause
    exit /b 1
)
echo   Semnatura: %SIG_FILE%

:: Read signature content
set /p SIGNATURE=<"%SIG_FILE%"
echo   Sig: %SIGNATURE:~0,30%...

:: Create updates dir
if not exist "%UPDATES_DIR%" mkdir "%UPDATES_DIR%"

:: Copy MSI
echo.
echo [1/3] Copiez MSI...
copy /Y "%MSI_FILE%" "%UPDATES_DIR%\" >nul
for %%f in ("%MSI_FILE%") do set MSI_NAME=%%~nxf
echo       %MSI_NAME%

:: Get server IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do set LOCALIP=%%a
set LOCALIP=%LOCALIP: =%

:: Generate manifest
echo [2/3] Generez manifest...
set DATETIME=%date:~6,4%-%date:~3,2%-%date:~0,2%T00:00:00Z

(
echo {
echo   "version": "%VERSION%",
echo   "notes": "Promix Automatix v%VERSION%",
echo   "pub_date": "%DATETIME%",
echo   "platforms": {
echo     "windows-x86_64": {
echo       "signature": "%SIGNATURE%",
echo       "url": "http://%LOCALIP%:3500/updates/%MSI_NAME%"
echo     }
echo   }
echo }
) > "%UPDATES_DIR%\latest.json"
echo       latest.json creat

:: Verify
echo [3/3] Verificare...
echo.
type "%UPDATES_DIR%\latest.json"

echo.
echo ============================================
echo   UPDATE PUBLICAT!
echo ============================================
echo.
echo   Versiune: %VERSION%
echo   MSI: %UPDATES_DIR%\%MSI_NAME%
echo   Manifest: %UPDATES_DIR%\latest.json
echo   URL: http://%LOCALIP%:3500/updates/%MSI_NAME%
echo.
echo   Clientii cu versiune mai veche vor primi
echo   notificare de update automat.
echo ============================================
pause
