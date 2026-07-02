# =============================================================================
# build-installer.ps1 - Compile the custom NSIS installer for Automatix
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts\build-installer.ps1
#
# Options:
#   -SkipBuild   Skip the Tauri binary build (reuse the existing .exe)
#   -OutDir      Output directory (default: public\downloads)
# =============================================================================
param(
    [switch]$SkipBuild,
    [string]$OutDir = "public\downloads"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ROOT     = Split-Path $PSScriptRoot -Parent
$NSIS_DIR = "$ROOT\src-tauri\nsis"
$NSIS_EXE = "$env:LOCALAPPDATA\tauri\NSIS\makensis.exe"
$BINARY   = "$ROOT\src-tauri\target\release\automatix.exe"
$ICON     = "$ROOT\src-tauri\icons\icon.ico"

# Keep package.json / tauri.conf.json in sync with VERSION.txt before building.
Write-Host "[installer] Stamping version from VERSION.txt..." -ForegroundColor Yellow
Push-Location $ROOT
node scripts/stamp-version.mjs
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "stamp-version failed." }
Pop-Location

# Read version from tauri.conf.json (stamped above)
$conf    = Get-Content "$ROOT\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
$version = $conf.version
Write-Host "[installer] Building Automatix-Setup-$version.exe" -ForegroundColor Cyan

# Preflight checks
if (-not (Test-Path $NSIS_EXE)) {
    Write-Error "makensis.exe not found at $NSIS_EXE - run 'npx tauri build' once to download NSIS."
}
if (-not (Test-Path $ICON)) {
    Write-Error "Icon not found: $ICON"
}

# Build the Tauri binary.
#
# IMPORTANT: build via the Tauri CLI, NOT 'cargo build --release'. A raw cargo
# build produces a binary that loads the DEV server URL (localhost:1420) instead
# of the bundled frontend, so the installed app shows "localhost refused to
# connect". 'tauri build' sets the production frontend-resolution flag so the
# binary serves the embedded ../dist assets from tauri.localhost.
# '--no-bundle' skips Tauri's own NSIS/MSI + updater signing (we ship our OWN
# custom installer below). The CLI's beforeBuildCommand runs build:tauri-frontend,
# which rebuilds + trims dist for the desktop bundle.
if (-not $SkipBuild) {
    Write-Host "[installer] Building Tauri binary (npx tauri build --no-bundle)..." -ForegroundColor Yellow
    Push-Location $ROOT
    npx tauri build --no-bundle
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "tauri build failed." }
    Pop-Location
} else {
    Write-Host "[installer] Skipping Tauri build (-SkipBuild flag set)" -ForegroundColor DarkGray
}

if (-not (Test-Path $BINARY)) {
    Write-Error "Binary not found: $BINARY - run without -SkipBuild first."
}

$sizeMB = [Math]::Round((Get-Item $BINARY).Length / 1MB, 1)
Write-Host "[installer] Binary: $BINARY ($sizeMB MB)" -ForegroundColor Green

# Compile NSIS installer
Write-Host "[installer] Running makensis..." -ForegroundColor Yellow
Push-Location $NSIS_DIR
& $NSIS_EXE /DAPPVER="$version" installer.nsi
$nsisExit = $LASTEXITCODE
Pop-Location

if ($nsisExit -ne 0) {
    Write-Error "makensis exited with code $nsisExit"
}

# Move output to public/downloads
$produced = "$NSIS_DIR\Automatix-Setup-$version.exe"
if (-not (Test-Path $produced)) {
    Write-Error "Expected output not found: $produced"
}

$dest = "$ROOT\$OutDir"
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

$destFile = "$dest\Automatix-Setup-$version.exe"
Copy-Item $produced $destFile -Force
Remove-Item $produced -Force

$finalMB = [Math]::Round((Get-Item $destFile).Length / 1MB, 1)

# Restore the full web dist.
#
# 'tauri build' ran build:tauri-frontend, which leaves dist/ trimmed and with a
# relative base ('./') for the desktop bundle. Rebuild the normal WEB dist so the
# running server serves a complete frontend (base '/') AND so dist/downloads picks
# up the freshly built installer we just copied into public/downloads.
if (-not $SkipBuild) {
    Write-Host "[installer] Restoring full web dist (npm run build)..." -ForegroundColor Yellow
    Push-Location $ROOT
    npm run build
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "web dist build failed." }
    Pop-Location
}

Write-Host ""
Write-Host "  Automatix-Setup-$version.exe ($finalMB MB)" -ForegroundColor Green
Write-Host "  -> $destFile" -ForegroundColor Green
Write-Host ""
Write-Host "[installer] Done." -ForegroundColor Cyan
