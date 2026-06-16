#!/usr/bin/env bash
# Install PROMIX systemd units (run as root)
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "This script needs root. Run: sudo $0"
  exit 1
fi

SRC="$(dirname "$(readlink -f "$0")")"

# Log directory owned by admin
mkdir -p /var/log/promix
chown admin:admin /var/log/promix

# Stop running instances if any
systemctl stop promix-server.service promix-ai-service.service 2>/dev/null || true

# Install unit files
install -m 0644 "$SRC/promix-ai-service.service" /etc/systemd/system/
install -m 0644 "$SRC/promix-server.service"     /etc/systemd/system/

systemctl daemon-reload
systemctl enable --now promix-ai-service.service
systemctl enable --now promix-server.service

echo
echo "Status:"
systemctl --no-pager status promix-ai-service.service | head -5
echo
systemctl --no-pager status promix-server.service | head -5
echo
echo "Logs: /var/log/promix/{ai-service,server}.log"
echo "Live: journalctl -fu promix-server -u promix-ai-service"
