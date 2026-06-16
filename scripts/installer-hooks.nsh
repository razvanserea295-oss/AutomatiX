; NSIS installer hooks — applied by electron-builder via `nsis.include`.
;
; We register a loopback-only firewall exception for ai-service.exe so the
; renderer can reach 127.0.0.1:8100 without a UAC popup. LAN exposure is the
; user's choice (Settings → AI Service → Expose on LAN) and adds a second rule.

!macro customInstall
  SetOutPath "$INSTDIR\resources\ai-service"

  ; Allow ai-service.exe to listen on localhost (no admin prompt on launch).
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Promix AI Service (localhost)" dir=in action=allow program="$INSTDIR\resources\ai-service\ai-service.exe" enable=yes profile=private remoteip=127.0.0.1'

  ; Allow Automatix.exe to call the central server (TCP 3500) and AI service
  ; (TCP 8100). Without this, "failed to fetch" hits client PCs whose
  ; outbound rules deny untrusted apps. Applied to all profiles so domain-
  ; joined and workgroup PCs both work.
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Automatix (server outbound)" dir=out action=allow program="$INSTDIR\Automatix.exe" enable=yes profile=any protocol=tcp remoteport=3500,8100'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Promix AI Service (localhost)"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Promix AI Service (LAN)"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Automatix (server outbound)"'
!macroend
