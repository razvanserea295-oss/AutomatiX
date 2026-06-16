@echo off
setlocal enabledelayedexpansion

REM ===================================================================
REM Automatix - Instalare client (LAN local)
REM
REM Dublu-click pe acest fisier. Va:
REM   1. descarca cea mai noua versiune de pe serverul intern
REM   2. deblocheaza fisierul (bypass SmartScreen "Mark of the Web")
REM   3. ruleaza installer-ul silent
REM
REM Necesita: conexiune la reteaua interna unde ruleaza serverul (192.168.2.109).
REM ===================================================================

set SERVER=http://192.168.2.109:3500
set UPDATE=%SERVER%/api/update

echo.
echo ===================================================================
echo   Automatix - Instalare client
echo ===================================================================
echo   Server: %SERVER%
echo.

REM --- 1. Test conectivitate ----------------------------------------
echo [1/4] Verific conexiunea la server...
curl -s -o nul -w "%%{http_code}" "%UPDATE%/latest.yml" > "%TEMP%\automatix-probe.txt"
set /p HTTP=<"%TEMP%\automatix-probe.txt"
del "%TEMP%\automatix-probe.txt" 2>nul
if not "%HTTP%"=="200" (
  echo.
  echo   [EROARE] Serverul nu raspunde ^(HTTP %HTTP%^).
  echo   Verifica:
  echo     - PC-ul este conectat la reteaua locala unde e serverul
  echo     - Pe serverul Windows portul 3500 este deschis in firewall
  echo     - Adresa serverului este corecta ^(192.168.2.109^)
  echo.
  pause
  exit /b 1
)
echo       OK ^(%SERVER%^)
echo.

REM --- 2. Citeste versiunea curenta din manifest --------------------
echo [2/4] Citesc versiunea curenta...
set VERSION=
for /f "tokens=2" %%v in ('curl -s "%UPDATE%/latest.yml" ^| findstr /b "version:"') do set VERSION=%%v
if "%VERSION%"=="" (
  echo   [EROARE] Nu pot citi versiunea din latest.yml
  pause
  exit /b 1
)
echo       Versiune disponibila: %VERSION%
echo.

REM --- 3. Download installer ----------------------------------------
set INSTALLER=%TEMP%\AutomatixSetup-%VERSION%.exe
echo [3/4] Descarc installer-ul ^(~120 MB^)...
curl -L --progress-bar -o "%INSTALLER%" "%UPDATE%/Automatix%%20Setup%%20%VERSION%.exe"
if not exist "%INSTALLER%" (
  echo   [EROARE] Descarcarea a esuat.
  pause
  exit /b 1
)
echo       OK
echo.

REM --- 4. Unblock + run ---------------------------------------------
echo [4/4] Pornesc instalarea ^(deblochez SmartScreen, rulez silent^)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '%INSTALLER%' -ErrorAction SilentlyContinue"

REM NSIS oneClick: instaleaza silent, deschide app-ul automat la final.
"%INSTALLER%"
set RC=%ERRORLEVEL%

REM Cleanup (ignora erorile)
del "%INSTALLER%" 2>nul

echo.
if %RC% EQU 0 (
  echo ===================================================================
  echo   Instalare completa. App-ul s-a deschis automat.
  echo.
  echo   Login initial:
  echo     User: admin
  echo     Parola: Admin@123
  echo.
  echo   Server-ul e deja preconfigurat la %SERVER%.
  echo ===================================================================
) else (
  echo ===================================================================
  echo   [EROARE] Installer-ul a iesit cu cod %RC%.
  echo   Daca apare warning Windows SmartScreen:
  echo     1. Click pe "More info" / "Mai multe informatii"
  echo     2. Click pe "Run anyway" / "Executati oricum"
  echo ===================================================================
)
pause
