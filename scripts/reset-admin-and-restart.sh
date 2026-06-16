#!/usr/bin/env bash
# Stops services, resets admin password, restarts services.
# Run as root: sudo /home/admin/Automatix-Dev/scripts/reset-admin-and-restart.sh <new-password>
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Run as root: sudo $0 <new-password>"
  exit 1
fi

PASSWORD="${1:-}"
if [ -z "$PASSWORD" ]; then
  echo "Usage: $0 <new-password>"
  exit 1
fi

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "[1/4] Stopping services..."
systemctl stop promix-server.service promix-ai-service.service

echo "[2/4] Resetting admin password..."
sudo -u admin /usr/bin/node "$SCRIPT_DIR/reset-admin-password.mjs" "$PASSWORD"

echo "[3/4] Starting promix-server..."
systemctl start promix-server.service

echo "[4/4] Starting promix-ai-service..."
systemctl start promix-ai-service.service

sleep 6
echo
echo "=== Status ==="
systemctl --no-pager status promix-server promix-ai-service | grep -E "Active|Main PID" | head -8
echo
echo "=== Ports ==="
ss -tlnp 2>/dev/null | grep -E ":(3500|8100)"
