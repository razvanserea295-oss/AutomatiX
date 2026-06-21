#!/bin/bash
# Shared Storage Pool - Deployment Script
# Run this on the production server

set -e

echo "=== Deploying Shared Storage Pool Feature ==="

# 1. Navigate to app directory
cd /opt/promix || exit 1

# 2. Backup current database
echo "Backing up database..."
cp data/promix.db data/promix.db.backup.$(date +%Y%m%d_%H%M%S) || true

# 3. Pull latest code
echo "Pulling latest code..."
git pull origin main

# 4. Install dependencies
echo "Installing dependencies..."
npm ci

# 5. Build frontend and server
echo "Building application..."
npm run build:prod

# 6. Ensure shared-files directory exists
echo "Setting up shared files directory..."
mkdir -p data/shared-files
chmod 755 data/shared-files

# 7. Restart service
echo "Restarting service..."
sudo systemctl restart promix

echo "=== Deployment Complete ==="
echo "Check: sudo systemctl status promix"
echo "Logs: sudo journalctl -u promix -f"