@echo off
REM ===================================================================
REM Automatix Server — Windows Firewall Setup
REM
REM Click-dreapta pe acest fisier > "Run as administrator"
REM (sau "Executare ca administrator" pe Windows in romana)
REM
REM Deschide porturile pentru:
REM   - Server Express HTTP API     -> TCP 3500 inbound
REM   - AI Service (cand va rula)   -> TCP 8100 inbound
REM
REM Profilurile Domain + Private (NU Public, ca sa nu expui pe wifi-uri
REM publice). Ruleaza o singura data; reguli persistente.
REM ===================================================================

NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo.
  echo [EROARE] Trebuie rulat ca administrator.
  echo Click-dreapta pe acest fisier ^> "Run as administrator"
  echo.
  pause
  exit /b 1
)

echo Sterg regulile vechi (daca exista)...
netsh advfirewall firewall delete rule name="Automatix Server (TCP 3500)" >nul 2>&1
netsh advfirewall firewall delete rule name="Automatix AI Service (TCP 8100)" >nul 2>&1

echo Adaug regula: Automatix Server TCP 3500 inbound...
netsh advfirewall firewall add rule ^
  name="Automatix Server (TCP 3500)" ^
  dir=in action=allow protocol=TCP localport=3500 ^
  profile=domain,private enable=yes
IF %ERRORLEVEL% NEQ 0 goto fail

echo Adaug regula: Automatix AI Service TCP 8100 inbound...
netsh advfirewall firewall add rule ^
  name="Automatix AI Service (TCP 8100)" ^
  dir=in action=allow protocol=TCP localport=8100 ^
  profile=domain,private enable=yes
IF %ERRORLEVEL% NEQ 0 goto fail

echo.
echo [OK] Reguli firewall adaugate cu succes.
echo Clientii din LAN pot accesa acum:
echo   http://192.168.2.109:3500   (server API)
echo   http://192.168.2.109:8100   (AI service, cand va rula)
echo.
pause
exit /b 0

:fail
echo.
echo [EROARE] Adaugarea regulii a esuat. Verifica daca rulezi ca admin.
pause
exit /b 1
