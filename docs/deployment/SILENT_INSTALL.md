# Silent install pe stațiile user

## NSIS (recomandat — nu cere admin pentru per-user install)

```cmd
"Automatix Setup 3.0.4.exe" /S
```

Flag-uri suplimentare NSIS suportate:
- `/S` — silent (no UI)
- `/D=C:\Apps\Automatix` — folder de instalare (must be last)
- `/allusers` — instalează pentru toți utilizatorii (cere admin)
- `/currentuser` — doar user-ul curent (default, no admin)

Exemplu deploy via PsExec:
```cmd
psexec \\PC-USER-01 -s -h -d "\\fileserver\automatix\Automatix Setup 3.0.4.exe" /S
```

## MSI (pentru GPO / Intune / SCCM)

```cmd
msiexec /i "Automatix 3.0.4.msi" /qn /l*v automatix-install.log
```

## Verificare după install

Pe stația user, pornește app-ul. Va sări direct la ecranul de **login** (fără
FirstRunWizard) pentru că `VITE_DEFAULT_SERVER_URL` e bakeat în installer.
Fluxul utilizatorului: dublu-click iconul → tastează username + parolă → în app.

## Firewall

Installer-ul adaugă automat regula Windows Firewall pentru `Automatix.exe`
outbound TCP 3500+8100 către serverul configurat. Niciun click necesar.
