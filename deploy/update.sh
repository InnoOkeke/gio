#!/usr/bin/env bash
# Pull the latest GIO from GitHub, rebuild, and restart. Run on the server as root
# (for example with AWS Systems Manager Run Command).
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin
cd /opt/gio/app
sudo -u gio git fetch --depth 1 origin master
sudo -u gio git reset --hard origin/master
sudo -u gio HOME=/opt/gio PATH="$PATH" /usr/local/bin/npm ci --no-audit --no-fund
sudo -u gio HOME=/opt/gio PATH="$PATH" /usr/local/bin/npm run build
chmod 755 deploy/start.sh
systemctl restart gio
sleep 4
curl -fsS http://127.0.0.1:3001/api/health && echo