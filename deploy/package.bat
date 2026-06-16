@echo off
title Promix - Build Network Package
echo ============================================
echo   Creare pachet de retea Promix Automatix
echo ============================================
echo.

set ROOT=%~dp0..
set OUT=%~dp0PromixNetwork

:: Clean
if exist "%OUT%" rmdir /S /Q "%OUT%"
mkdir "%OUT%"
mkdir "%OUT%\web"

:: Copy server binary
echo [1/4] Copiez serverul...
copy /Y "%ROOT%\promix-server\target\release\promix-server.exe" "%OUT%\promix-server.exe" >nul 2>&1
if not exist "%OUT%\promix-server.exe" (
    echo [!] Nu gasesc promix-server.exe release. Incerc din cache...
    copy /Y "C:\psb\release\promix-server.exe" "%OUT%\promix-server.exe" >nul 2>&1
)
if not exist "%OUT%\promix-server.exe" (
    echo [EROARE] Nu s-a gasit promix-server.exe! Ruleaza: cd promix-server ^&^& cargo build --release
    pause
    exit /b 1
)
echo       OK

:: Copy web frontend
echo [2/4] Copiez frontend-ul web...
xcopy /E /Y /Q "%ROOT%\dist\*" "%OUT%\web\" >nul
echo       OK

:: Copy setup script
echo [3/4] Copiez scriptul de instalare...
copy /Y "%~dp0setup-server.bat" "%OUT%\setup-server.bat" >nul
echo       OK

:: Copy Tauri installer if exists
echo [4/4] Caut installer-ul desktop...
set BUNDLE_DIR=%ROOT%\src-tauri\target\release\bundle
if exist "%BUNDLE_DIR%\nsis\*.exe" (
    for %%f in ("%BUNDLE_DIR%\nsis\*.exe") do (
        copy /Y "%%f" "%OUT%\PromixAutomatix-Setup.exe" >nul
        echo       Gasit: %%~nxf
    )
) else if exist "%BUNDLE_DIR%\msi\*.msi" (
    for %%f in ("%BUNDLE_DIR%\msi\*.msi") do (
        copy /Y "%%f" "%OUT%\PromixAutomatix-Setup.msi" >nul
        echo       Gasit: %%~nxf
    )
) else (
    echo       [!] Nu s-a gasit installer desktop (optional - clientii pot folosi browser)
)

echo.
echo ============================================
echo   PACHET CREAT: %OUT%
echo ============================================
echo.
echo   Continut:
dir /B "%OUT%"
echo.
echo   Instructiuni:
echo   1. Copiaza folderul PromixNetwork pe PC-ul server
echo   2. Ruleaza setup-server.bat ca Administrator
echo   3. Porneste start-server.bat
echo   4. Pe clienti: deschide http://[IP-SERVER]:3500
echo.
pause
