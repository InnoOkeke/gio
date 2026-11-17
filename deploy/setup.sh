#!/usr/bin/env bash
# First-boot setup for a GIO server on Ubuntu 24.04 (used as Lightsail launch script).
# Installs Node 22 (official build, checksum-verified), nginx, and GIO as a locked-down systemd service.
# Secrets are NOT set here: put them in /etc/gio/gio.env afterwards (see deploy/README.md).
set -euo pipefail

REPO="${GIO_REPO:-https://github.com/InnoOkeke/gio.git}"
APP_DIR=/opt/gio/app
DATA_DIR=/var/lib/gio
ENV_FILE=/etc/gio/gio.env

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends nginx git curl ca-certificates xz-utils build-essential python3

# A little swap so building on a 1 GB server can't run out of memory.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Node.js 22 from nodejs.org, verified against the published SHA-256 list.
cd /tmp
curl -fsSLO https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt
NODE_TAR=$(grep -oE 'node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz' SHASUMS256.txt | head -n1)
curl -fsSLO "https://nodejs.org/dist/latest-v22.x/${NODE_TAR}"
grep " ${NODE_TAR}\$" SHASUMS256.txt | sha256sum -c -
tar -xJf "${NODE_TAR}" -C /usr/local --strip-components=1
rm -f "${NODE_TAR}" SHASUMS256.txt
node --version

# A system user with no shell and no home login.
id gio >/dev/null 2>&1 || useradd --system --home-dir /opt/gio --shell /usr/sbin/nologin gio
mkdir -p /opt/gio "$DATA_DIR" /etc/gio
chown gio:gio /opt/gio "$DATA_DIR"
chmod 750 "$DATA_DIR"
chmod 700 /etc/gio

if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u gio git clone --depth 1 "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
sudo -u gio HOME=/opt/gio npm ci --no-audit --no-fund
sudo -u gio HOME=/opt/gio npm run build

cat > /etc/systemd/system/gio.service <<'UNIT'
[Unit]
Description=GIO (Logo for kids)
After=network-online.target
Wants=network-online.target
# Wait until the secrets file exists (it is copied in after first boot).
ConditionPathExists=/etc/gio/gio.env

[Service]
User=gio
Group=gio
WorkingDirectory=/opt/gio/app
EnvironmentFile=/etc/gio/gio.env
Environment=NODE_ENV=production
ExecStart=/usr/local/bin/node dist/api/server.js
Restart=always
RestartSec=3
# Hardening: the app can only write its database directory.
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/gio
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/nginx/sites-available/gio <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    server_tokens off;
    client_max_body_size 200k;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/gio /etc/nginx/sites-enabled/gio
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

systemctl daemon-reload
systemctl enable gio
echo "GIO setup finished. Add $ENV_FILE, then: systemctl start gio"
