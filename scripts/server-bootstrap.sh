#!/usr/bin/env bash
# PROMIX Automatix server bootstrap. Run on a fresh Linux PC to set this
# machine up as the company-wide server.
#
# Usage: sudo ./scripts/server-bootstrap.sh
#
# What it does:
#   1. Detects the LAN IP and writes it into ai-service/config.toml
#   2. Sets ai-service to bind 0.0.0.0 (LAN reachable)
#   3. Opens UFW for ports 3500 (server) and 8100 (ai-service)
#   4. Installs systemd units (promix-server, promix-ai-service)
#   5. Starts both services
#   6. Prints the URL clients should use

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Run as root: sudo $0"
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
cd "$PROJECT_ROOT"

PRIMARY_IP="$(ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1 | head -1)"
if [ -z "$PRIMARY_IP" ]; then
  echo "ERROR: could not detect LAN IP. Aborting."
  exit 1
fi
echo "[bootstrap] Detected LAN IP: $PRIMARY_IP"

# 1+2. ai-service config — bind 0.0.0.0
CFG="$PROJECT_ROOT/ai-service/config.toml"
if [ -f "$CFG" ]; then
  sed -i 's/^host = "127.0.0.1"/host = "0.0.0.0"/' "$CFG"
  echo "[bootstrap] ai-service config: bind 0.0.0.0"
fi

# 3. Firewall
if command -v ufw >/dev/null; then
  ufw allow 3500/tcp comment "PROMIX server"        >/dev/null
  ufw allow 8100/tcp comment "PROMIX ai-service"    >/dev/null
  ufw reload >/dev/null 2>&1 || true
  echo "[bootstrap] UFW: opened 3500 + 8100"
fi

# 4. systemd units (idempotent)
"$PROJECT_ROOT/deploy/systemd/install.sh" >/dev/null

# 5. Make sure migrations + dist-server exist (for first-run on a fresh box)
if [ ! -d "$PROJECT_ROOT/dist-server" ]; then
  echo "[bootstrap] Building server (tsc -p tsconfig.server.json)..."
  sudo -u "$(stat -c %U "$PROJECT_ROOT")" /usr/bin/npx tsc -p tsconfig.server.json
fi

# Ensure server picks up new config and migrations runs
systemctl restart promix-server.service
sleep 3
systemctl restart promix-ai-service.service
sleep 5

# 6. Print the URL clients should use
echo
echo "============================================================"
echo "  PROMIX Automatix Server is up"
echo "============================================================"
echo "  Server URL (give this to clients): http://$PRIMARY_IP:3500"
echo "  AI service:                         http://$PRIMARY_IP:8100"
echo "  Installer download (Windows):       http://$PRIMARY_IP:3500/api/update/"
echo
echo "  Status:"
systemctl --no-pager status promix-server promix-ai-service | grep -E "Active|Main PID" | head -8
echo
echo "  Tail logs: journalctl -fu promix-server -u promix-ai-service"
echo "============================================================"

# 7. Memory hint: if rebuilding the Windows installer for a new server,
#    bake the URL so clients don't have to type it:
#       VITE_DEFAULT_SERVER_URL=http://$PRIMARY_IP:3500 npm run build:electron -- --win --x64
echo
echo "Tip: rebuild Windows installer with the URL baked in:"
echo "  VITE_DEFAULT_SERVER_URL=http://$PRIMARY_IP:3500 npm run build:electron -- --win --x64"
