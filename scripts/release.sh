#!/usr/bin/env bash
# Build Windows installer + publish to all distribution points:
#   1. updates/        → auto-updater (existing installs get the new version)
#   2. USB stick       → if /run/media/admin/<label> is mounted (for fresh installs)
#   3. Desktop         → quick local copy
# Removes prior Automatix installer files at each destination so users always
# pick up the newest version.
#
# Usage:
#   ./scripts/release.sh                      # uses VITE_DEFAULT_SERVER_URL from env
#   SERVER_URL=http://1.2.3.4:3500 ./scripts/release.sh
#   ./scripts/release.sh --no-build           # skip build, just redistribute existing release/

set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

SERVER_URL="${SERVER_URL:-${VITE_DEFAULT_SERVER_URL:-http://192.168.2.123:3500}}"
DO_BUILD=1
[ "${1:-}" = "--no-build" ] && DO_BUILD=0

VERSION="$(node -p "require('./package.json').version")"
NSIS="release/Automatix Setup ${VERSION}.exe"
MSI="release/Automatix ${VERSION}.msi"
LATEST_YML="release/latest.yml"

if [ $DO_BUILD -eq 1 ]; then
  echo "[release] Building installer for v${VERSION} with VITE_DEFAULT_SERVER_URL=${SERVER_URL}"
  VITE_DEFAULT_SERVER_URL="$SERVER_URL" npm run build:electron -- --win --x64

  # Server-mode runs from dist-server/, which `build:electron` does NOT touch.
  # Recompile so this Linux box (running promix-server.service) picks up the
  # same fixes the Windows clients are getting in the installer.
  echo "[release] Recompiling dist-server/"
  npx tsc -p tsconfig.server.json

  if systemctl is-active --quiet promix-server.service 2>/dev/null; then
    if [ "${RESTART_SERVER:-1}" = "1" ]; then
      echo "[release] Restarting promix-server.service to load new code (sudo)"
      sudo -n systemctl restart promix-server.service 2>/dev/null \
        || echo "  (sudo non-interactive failed — run: sudo systemctl restart promix-server)"
    fi
  fi
fi

[ -f "$NSIS" ] || { echo "ERROR: $NSIS not found. Run a build first."; exit 1; }

# 1. updates/ for auto-updater
echo "[release] Staging to updates/ (auto-updater)"
mkdir -p updates
find updates -maxdepth 1 -name "Automatix Setup *.exe" -not -name "Automatix Setup ${VERSION}.exe" -delete 2>/dev/null || true
find updates -maxdepth 1 -name "*.blockmap" -delete 2>/dev/null || true
cp "$NSIS" updates/
[ -f "$LATEST_YML" ] && cp "$LATEST_YML" updates/

# 2. USB stick (if mounted)
STICK="$(find /run/media/admin -mindepth 1 -maxdepth 1 -type d ! -name "Workspace" 2>/dev/null | head -1)"
if [ -n "$STICK" ]; then
  echo "[release] Copying to USB stick: $STICK"
  find "$STICK" -maxdepth 1 -name "Automatix Setup *.exe" -not -name "Automatix Setup ${VERSION}.exe" -delete 2>/dev/null || true
  cp "$NSIS" "$STICK/"
  sync
else
  echo "[release] No USB stick mounted (skipping)"
fi

# 3. Desktop
DESKTOP="$HOME/Desktop"
if [ -d "$DESKTOP" ]; then
  echo "[release] Copying to Desktop"
  find "$DESKTOP" -maxdepth 1 -name "Automatix Setup *.exe" -not -name "Automatix Setup ${VERSION}.exe" -delete 2>/dev/null || true
  find "$DESKTOP" -maxdepth 1 -name "Automatix *.msi" -not -name "Automatix ${VERSION}.msi" -delete 2>/dev/null || true
  cp "$NSIS" "$DESKTOP/"
  [ -f "$MSI" ] && cp "$MSI" "$DESKTOP/"
fi

echo
echo "============================================================"
echo "  Released v${VERSION}"
echo "============================================================"
echo "  Auto-update for installed PCs:"
echo "    ${SERVER_URL}/api/update/Automatix%20Setup%20${VERSION}.exe"
[ -n "$STICK" ] && echo "  USB stick: ${STICK}"
echo "  Desktop:   ${DESKTOP}"
echo "============================================================"
