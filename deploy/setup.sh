#!/usr/bin/env bash
# First-boot setup for a GIO server (Amazon Linux 2023 or Ubuntu 24.04), used as EC2 user data.
# Installs Node 22 (official build, checksum-verified), nginx, and GIO as a locked-down systemd service.
# No secrets here: the Bedrock API key is read from Parameter Store when GIO starts (see deploy/README.md).

# Some launchers run user data with sh, not bash; switch to bash so the rest of this script works.
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
set -euo pipefail

REPO="${GIO_REPO:-https://github.com/InnoOkeke/gio.git}"
APP_DIR=/opt/gio/app
DATA_DIR=/var/lib/gio
ENV_FILE=/etc/gio/gio.env

if command -v dnf >/dev/null 2>&1; then
  dnf install -y nginx git tar xz gcc-c++ make python3
  command -v aws >/dev/null 2>&1 || dnf install -y awscli-2
else
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y --no-install-recommends nginx git curl ca-certificates xz-utils build-essential python3
fi

# A little swap so building on a 1 GB server can't run out of memory.
if ! swapon --show | grep -q /swapfile; then
  dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
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
/usr/local/bin/node --version

# A system user with no login shell.
id gio >/dev/null 2>&1 || useradd --system --home-dir /opt/gio --shell /sbin/nologin gio
mkdir -p /opt/gio "$DATA_DIR" /etc/gio
chown gio:gio /opt/gio "$DATA_DIR"
chmod 750 "$DATA_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u gio git clone --depth 1 "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
sudo -u gio HOME=/opt/gio PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/npm ci --no-audit --no-fund
sudo -u gio HOME=/opt/gio PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/npm run build
chmod 755 deploy/start.sh

# Server settings (not secrets). Keep an existing file so re-running setup doesn't overwrite changes.
if [ ! -f "$ENV_FILE" ]; then
  install -m 644 -o root -g root deploy/gio.env.example "$ENV_FILE"
fi

cat > /etc/systemd/system/gio.service <<'UNIT'
[Unit]
Description=GIO (Logo for kids)
After=network-online.target
Wants=network-online.target
# Keep retrying until the Bedrock key exists in Parameter Store.
StartLimitIntervalSec=0

[Service]
User=gio
Group=gio
WorkingDirectory=/opt/gio/app
EnvironmentFile=/etc/gio/gio.env
Environment=NODE_ENV=production
Environment=HOME=/var/lib/gio
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/opt/gio/app/deploy/start.sh
Restart=always
RestartSec=10
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

# nginx: one server that forwards everything to GIO on port 3001.
cat > /etc/nginx/nginx.conf <<'NGINX'
worker_processes auto;
pid /run/nginx.pid;
events { worker_connections 1024; }
http {
    server_tokens off;
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    client_max_body_size 200k;
    # The Python engine (about 13.5 MB, the wasm is 9.6 MB) shrinks to about 7.5 MB with gzip.
    gzip on;
    # application/manifest+json is the installable app's manifest.webmanifest.
    gzip_types application/wasm application/javascript text/javascript application/zip application/json application/manifest+json text/css image/svg+xml;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_proxied any;
    # API Gateway reports the visitor in the last "Forwarded: ...;for=<ip>" entry and sends no
    # X-Forwarded-For. Pass that IP on so per-visitor rate limits work (TRUST_PROXY=1).
    # Entries a visitor adds themselves come earlier in the list, so they can't spoof it.
    map $http_forwarded $gio_client_ip {
        "~for=\"?\[?(?<ip>[0-9A-Fa-f.:]+)\]?\"?[^,]*$" $ip;
        default $proxy_add_x_forwarded_for;
    }
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
        # Optional origin check, kept out of git (see deploy/README.md): rejects requests that
        # don't carry the secret header added by API Gateway. Matches nothing if the file is absent.
        include /etc/gio/nginx-origin*.conf;
        location / {
            proxy_pass http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $gio_client_ip;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
        }
    }
}
NGINX
nginx -t
systemctl enable --now nginx
systemctl reload nginx

systemctl daemon-reload
systemctl enable --now gio
echo "GIO setup finished. It starts serving once the Bedrock key exists at the Parameter Store name in $ENV_FILE."
