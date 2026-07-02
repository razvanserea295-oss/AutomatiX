; -----------------------------------------------------------------------------
; Automatix - minimal single-screen installer (Arc-style look).
;
; Install is USER-INITIATED (a click), not auto-run, and does NOT force-kill any
; process. This keeps the installer's behavioural profile clean so Windows
; Defender's ML heuristics (Bearfoos.B!ml) don't false-positive an unsigned
; NSIS build. If the app is already running we ask the user to close it rather
; than terminating it.
;
; Build: makensis.exe /DAPPVER=x.y.z installer.nsi   (from src-tauri\nsis\)
; -----------------------------------------------------------------------------
Unicode True
ManifestDPIAware True
ManifestSupportedOS all

!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"
; nsExec is a plugin (Plugins\x86-unicode\nsExec.dll), called directly as
; nsExec::ExecToStack — it has no .nsh header, so do NOT !include it.

; --- Fallback version (overridden by /DAPPVER= on the command line) ----------
!ifndef APPVER
  !define APPVER "1.1.6"
!endif

; --- Identity ----------------------------------------------------------------
!define APPNAME   "Automatix"
!define PUBLISHER "Promix"
!define BINARY    "automatix.exe"
!define SRC       ".."                     ; src-tauri/ (relative to nsis/)

!define REG_UNINST "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
!define REG_APP    "Software\${PUBLISHER}\${APPNAME}"

; --- NSIS settings -----------------------------------------------------------
Name    "${APPNAME}"
OutFile "Automatix-Setup-${APPVER}.exe"
InstallDir   "$LOCALAPPDATA\${APPNAME}"
InstallDirRegKey HKCU "${REG_UNINST}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma

Icon          "${SRC}\icons\icon.ico"
UninstallIcon "${SRC}\icons\icon.ico"

; --- State variables ---------------------------------------------------------
Var hStatus
Var hBar
Var hChk
Var hIcon

; Returns 1 on the stack when automatix.exe is running, 0 otherwise.
; tasklist prints "INFO: No tasks..." when nothing matches — never treat
; non-empty output alone as "running"; pipe through find.exe like electron-builder.
Function IsAutomatixRunning
  ClearErrors
  nsExec::ExecToStack 'cmd /c tasklist /NH /FI "IMAGENAME eq automatix.exe" | find /I "automatix.exe"'
  Pop $R0
  Pop $R1
  ${If} $R0 == 0
    Push 1
  ${Else}
    Push 0
  ${EndIf}
FunctionEnd

; --- Pages -------------------------------------------------------------------
Page    custom PageInstall PageInstallLeave
UninstPage custom un.PageConfirm ""
UninstPage instfiles

; =============================================================================
; Install page - single dark screen. The standard wizard button (relabelled
; "Instaleaza") starts the install in the page LEAVE callback; we stay on the
; page to show progress, then relabel it "Finalizare". This is normal wizard
; behaviour (user-initiated, no auto-run, no force-kill) so Defender's ML
; heuristics don't false-positive the unsigned build.
; =============================================================================
Function PageInstall
  ; Keep the DEFAULT window size: resizing the outer window makes the nsDialogs
  ; inner dialog overlap (and hide) the wizard button bar. Default size keeps the
  ; "Instaleaza" button correctly placed and visible.
  SendMessage $HWNDPARENT ${WM_SETTEXT} 0 "STR:Instalare ${APPNAME}"

  ; -- Dark whole-window background --
  SetCtlColors $HWNDPARENT "" "0f1117"

  ; -- Hide NSIS branding strip --
  GetDlgItem $R2 $HWNDPARENT 1028
  ShowWindow $R2 ${SW_HIDE}

  ; -- Create custom dialog --
  nsDialogs::Create 1018
  Pop $R2
  ${If} $R2 == error
    Abort
  ${EndIf}

  ; -- Dark background fill (full-area opaque label) --
  ${NSD_CreateLabel} 0 0 100% 100% ""
  Pop $R3
  SetCtlColors $R3 "" "0f1117"

  ; -- App icon (48x48) --
  InitPluginsDir
  File /oname=$PLUGINSDIR\app.ico "${SRC}\icons\icon.ico"
  ${NSD_CreateIcon} 0 8u 100% 44u ""
  Pop $hIcon
  System::Call "user32::LoadImage(p 0, t '$PLUGINSDIR\app.ico', i 1, i 48, i 48, i 0x10) p.r0"
  SendMessage $hIcon ${STM_SETIMAGE} 1 $r0

  ; -- App name --
  ${NSD_CreateLabel} 0 52u 100% 20u "${APPNAME}"
  Pop $R3
  CreateFont $R4 "Segoe UI" "17" "600"
  SendMessage $R3 ${WM_SETFONT} $R4 0
  SetCtlColors $R3 "F9FAFB" "0f1117"

  ; -- Version --
  ${NSD_CreateLabel} 0 73u 100% 11u "v${APPVER}"
  Pop $R3
  CreateFont $R5 "Segoe UI" "9" "400"
  SendMessage $R3 ${WM_SETFONT} $R5 0
  SetCtlColors $R3 "6B7280" "0f1117"

  ; -- Status text --
  ${NSD_CreateLabel} 8% 95u 84% 11u "Apasa Instaleaza pentru a continua."
  Pop $hStatus
  SendMessage $hStatus ${WM_SETFONT} $R5 0
  SetCtlColors $hStatus "9CA3AF" "0f1117"

  ; -- Progress bar (hidden until install starts) --
  ${NSD_CreateProgressBar} 8% 108u 84% 8u ""
  Pop $hBar
  SendMessage $hBar ${PBM_SETRANGE32} 0 100
  SendMessage $hBar ${PBM_SETPOS} 0 0
  ShowWindow $hBar ${SW_HIDE}

  ; -- Launch checkbox - hidden until install done --
  ${NSD_CreateCheckbox} 8% 122u 84% 12u "Deschide ${APPNAME} dupa instalare"
  Pop $hChk
  SendMessage $hChk ${WM_SETFONT} $R5 0
  SetCtlColors $hChk "F9FAFB" "0f1117"
  ${NSD_Check} $hChk

  ; -- Relabel the standard wizard buttons (always visible in the button bar) --
  GetDlgItem $R7 $HWNDPARENT 1
  SendMessage $R7 ${WM_SETTEXT} 0 "STR:Instaleaza"
  GetDlgItem $R8 $HWNDPARENT 2
  SendMessage $R8 ${WM_SETTEXT} 0 "STR:Anuleaza"

  nsDialogs::Show
FunctionEnd

; --- Page LEAVE: runs when the user clicks the wizard button -------------------
Function PageInstallLeave
  ; If Automatix is already running, ask the user to close it (no force-kill).
  Call IsAutomatixRunning
  Pop $0
  ${If} $0 == 1
    SendMessage $hStatus ${WM_SETTEXT} 0 "STR:Inchide Automatix, apoi apasa din nou Instaleaza."
    Abort
  ${EndIf}

  ; Show progress
  ShowWindow $hBar ${SW_SHOW}
  SendMessage $hBar ${PBM_SETPOS} 10 0
  SendMessage $hStatus ${WM_SETTEXT} 0 "STR:Copiere fisiere..."

  SetOutPath "$INSTDIR"
  ClearErrors
  File "${SRC}\target\release\${BINARY}"
  ${If} ${Errors}
    Call IsAutomatixRunning
    Pop $0
    ${If} $0 == 1
      SendMessage $hStatus ${WM_SETTEXT} 0 "STR:Eroare la copiere. Inchide Automatix si reincearca."
    ${Else}
      SendMessage $hStatus ${WM_SETTEXT} 0 "STR:Eroare la copiere. Verifica permisiunile si spatiul pe disc, apoi reincearca."
    ${EndIf}
    ShowWindow $hBar ${SW_HIDE}
    Abort
  ${EndIf}

  ; Shortcuts
  SendMessage $hBar ${PBM_SETPOS} 55 0
  SendMessage $hStatus ${WM_SETTEXT} 0 "STR:Creare scurtaturi..."
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut  "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${BINARY}"
  CreateShortcut  "$DESKTOP\${APPNAME}.lnk"               "$INSTDIR\${BINARY}"

  ; Registry - Add/Remove Programs
  SendMessage $hBar ${PBM_SETPOS} 80 0
  SendMessage $hStatus ${WM_SETTEXT} 0 "STR:Inregistrare in sistem..."
  WriteRegStr   HKCU "${REG_UNINST}" "DisplayName"          "${APPNAME}"
  WriteRegStr   HKCU "${REG_UNINST}" "DisplayVersion"       "${APPVER}"
  WriteRegStr   HKCU "${REG_UNINST}" "Publisher"            "${PUBLISHER}"
  WriteRegStr   HKCU "${REG_UNINST}" "InstallLocation"      "$INSTDIR"
  WriteRegStr   HKCU "${REG_UNINST}" "UninstallString"      '"$INSTDIR\Uninstall.exe"'
  WriteRegStr   HKCU "${REG_UNINST}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegStr   HKCU "${REG_UNINST}" "DisplayIcon"          "$INSTDIR\${BINARY},0"
  WriteRegDWORD HKCU "${REG_UNINST}" "NoModify"             1
  WriteRegDWORD HKCU "${REG_UNINST}" "NoRepair"             1
  WriteRegStr   HKCU "${REG_APP}"    "InstallLocation"      "$INSTDIR"
  WriteRegStr   HKCU "${REG_APP}"    "Version"              "${APPVER}"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Done — launch optionally, then close the installer (no extra "Finalizare" click).
  SendMessage $hBar ${PBM_SETPOS} 100 0
  SendMessage $hStatus ${WM_SETTEXT} 0 "STR:${APPNAME} a fost instalat cu succes!"

  ${NSD_GetState} $hChk $0
  ${If} $0 == ${BST_CHECKED}
    Exec '"$INSTDIR\${BINARY}"'
  ${EndIf}
  Quit
FunctionEnd

; Empty section required by NSIS (install runs from the page-leave callback above;
; the optional post-install launch is handled there too, since with no instfiles
; page .onInstSuccess does not reliably fire).
Section ""
SectionEnd

; =============================================================================
; Uninstaller
; =============================================================================
Function un.PageConfirm
  SetCtlColors $HWNDPARENT "" "0f1117"
  GetDlgItem $0 $HWNDPARENT 1028
  ShowWindow $0 ${SW_HIDE}
  GetDlgItem $0 $HWNDPARENT 1
  SetCtlColors $0 "F9FAFB" "232730"
  GetDlgItem $0 $HWNDPARENT 2
  SetCtlColors $0 "9CA3AF" "232730"

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ; Dark fill
  ${NSD_CreateLabel} 0 0 100% 100% ""
  Pop $1
  SetCtlColors $1 "" "0f1117"

  ${NSD_CreateLabel} 0 70u 100% 20u "Dezinstalare ${APPNAME}"
  Pop $2
  CreateFont $3 "Segoe UI" "16" "600"
  SendMessage $2 ${WM_SETFONT} $3 0
  SetCtlColors $2 "F9FAFB" "0f1117"

  ${NSD_CreateLabel} 0 94u 100% 12u "Aplicatia si scurtaturile vor fi sterse. Datele de pe server raman intacte."
  Pop $4
  CreateFont $5 "Segoe UI" "9" "400"
  SendMessage $4 ${WM_SETFONT} $5 0
  SetCtlColors $4 "9CA3AF" "0f1117"

  nsDialogs::Show
FunctionEnd

Section "Uninstall"
  Delete "$INSTDIR\${BINARY}"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"

  Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
  RMDir  "$SMPROGRAMS\${APPNAME}"
  Delete "$DESKTOP\${APPNAME}.lnk"

  DeleteRegKey HKCU "${REG_UNINST}"
  DeleteRegKey HKCU "${REG_APP}"
SectionEnd
