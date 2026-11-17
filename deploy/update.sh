#!/usr/bin/env bash
# Pull the latest GIO from GitHub, rebuild, and restart. Run on the server with sudo.
set -euo pipefail
cd /opt/gio/app
sudo -u gio git fetch --depth 1 origin master
sudo -u gio git reset --hard origin/master
sudo -u gio HOME=/opt/gio npm ci --no-audit --no-fund
sudo -u gio HOME=/opt/gio npm run build
systemctl restart gio
sleep 2
curl -fsS http://127.0.0.1:3001/api/health && echo
