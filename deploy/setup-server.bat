@echo off
title Promix Automatix - Server Setup
color 0A

echo ============================================
echo   PROMIX AUTOMATIX - Instalare Server
echo   Retea LAN
echo ============================================
echo.

:: Check admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [EROARE] Ruleaza ca Administrator!
    echo Click dreapta -^> Run as administrator
    pause
    exit /b 1
)

:: Create directories
echo [1/5] Creez directoare...
if not exist "C:\PromixData" mkdir "C:\PromixData"
if not exist "C:\PromixData\web" mkdir "C:\PromixData\web"
if not exist "C:\PromixData\updates" mkdir "C:\PromixData\updates"
if not exist "C:\PromixServer" mkdir "C:\PromixServer"
echo       OK

:: Copy server
echo [2/5] Copiez serverul...
copy /Y "%~dp0promix-server.exe" "C:\PromixServer\promix-server.exe" >nul
echo       OK

:: Copy web frontend
echo [3/5] Copiez interfata web...
xcopy /E /Y /Q "%~dp0web\*" "C:\PromixData\web\" >nul
echo       OK

:: Get local IP
echo [4/5] Configurez reteaua...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set LOCALIP=%%a
)
set LOCALIP=%LOCALIP: =%
echo       IP local: %LOCALIP%

:: Add firewall rule
netsh advfirewall firewall show rule name="Promix Server" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="Promix Server" dir=in action=allow protocol=TCP localport=3500 >nul
    echo       Firewall: regula adaugata (port 3500)
) else (
    echo       Firewall: regula exista deja
)

:: Create start script
echo [5/5] Creez shortcut...
(
echo @echo off
echo title Promix Server
echo echo Promix Server pornit pe http://%LOCALIP%:3500
echo echo Clientii din retea se pot conecta la: http://%LOCALIP%:3500
echo echo.
echo echo Apasa Ctrl+C pentru a opri serverul.
echo echo.
echo set PROMIX_DB_PATH=C:\PromixData\promix.db
echo set PROMIX_PORT=3500
echo set PROMIX_WEB_DIR=C:\PromixData\web
echo set PROMIX_UPDATES_DIR=C:\PromixData\updates
echo "C:\PromixServer\promix-server.exe"
echo pause
) > "C:\PromixServer\start-server.bat"

:: Create desktop shortcut
(
echo [InternetShortcut]
echo URL=file:///C:/PromixServer/start-server.bat
) > "%USERPROFILE%\Desktop\Promix Server.url"

echo.
echo ============================================
echo   INSTALARE COMPLETA!
echo ============================================
echo.
echo   Server: C:\PromixServer\promix-server.exe
echo   Date:   C:\PromixData\promix.db
echo   Web:    C:\PromixData\web
echo   Port:   3500
echo.
echo   Porneste serverul:
echo   C:\PromixServer\start-server.bat
echo.
echo   Clienti (alta masina din retea):
echo   Deschide browser: http://%LOCALIP%:3500
echo   SAU instaleaza Promix Automatix si seteaza
echo   server URL: http://%LOCALIP%:3500
echo.
echo ============================================
pause
