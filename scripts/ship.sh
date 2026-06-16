#!/usr/bin/env bash
# One-shot ship: bump version, build the Windows installer, publish to updates/
# (and USB stick + Desktop if available). After this returns, every running
# Windows client picks up the new build within ~30 minutes via auto-updater.
#
# Usage:
#   ./scripts/ship.sh                # bump patch (1.0.3 → 1.0.4) and ship
#   ./scripts/ship.sh minor          # bump minor (1.0.3 → 1.1.0) and ship
#   ./scripts/ship.sh major          # bump major (1.0.3 → 2.0.0) and ship
#   ./scripts/ship.sh 1.2.3          # explicit version and ship
#   ./scripts/ship.sh --no-bump      # use current VERSION.txt as-is

set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

CURRENT="$(cat VERSION.txt | tr -d '[:space:]')"
[[ "$CURRENT" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]] || {
  echo "ERROR: VERSION.txt has invalid version: '$CURRENT'"
  exit 1
}
MAJ="${BASH_REMATCH[1]}"
MIN="${BASH_REMATCH[2]}"
PAT="${BASH_REMATCH[3]}"

case "${1:-patch}" in
  patch)        NEXT="${MAJ}.${MIN}.$((PAT + 1))" ;;
  minor)        NEXT="${MAJ}.$((MIN + 1)).0" ;;
  major)        NEXT="$((MAJ + 1)).0.0" ;;
  --no-bump)    NEXT="$CURRENT" ;;
  [0-9]*.[0-9]*.[0-9]*)
                NEXT="$1" ;;
  *)            echo "ERROR: unrecognized argument '$1' (use patch|minor|major|X.Y.Z|--no-bump)"; exit 1 ;;
esac

if [ "$NEXT" != "$CURRENT" ]; then
  echo "[ship] Bumping version: $CURRENT → $NEXT"
  echo "$NEXT" > VERSION.txt
  node scripts/stamp-version.mjs
else
  echo "[ship] Keeping version $CURRENT (no bump)"
fi

exec ./scripts/release.sh
