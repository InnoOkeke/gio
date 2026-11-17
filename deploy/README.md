# Deploying GIO

GIO runs on one small server: Node.js serves the API and the built UI on port 3001, nginx forwards port 80 to it, and an HTTPS address in front (for example an Amazon Lightsail distribution or CloudFront) provides TLS. HTTPS is required: browsers only allow the microphone, speech recognition and the clipboard on secure sites.

The reference deployment uses Amazon Lightsail in `eu-north-1`:

| Piece | Purpose |
|---|---|
| Lightsail instance (`micro_3_0`, Ubuntu 24.04) | Runs GIO; SQLite lives on the instance disk at `/var/lib/gio/gio.db` |
| Static IP | A fixed address for the instance |
| Lightsail distribution (`small_1_0`) | The public HTTPS address, with caching off so every request reaches GIO |
| Firewall | Port 80 open; port 22 open only to the operator's IP |

## 1. Create the server

Launch an Ubuntu 24.04 instance with `deploy/setup.sh` as its launch script. It installs Node 22 (checksum-verified), nginx, and a hardened `gio` systemd service, and builds the app from GitHub. It does not start GIO, because the secrets aren't there yet.

## 2. Add the secrets

Create `/etc/gio/gio.env` on the server, owned by root with mode `600`:

```
AWS_BEARER_TOKEN_BEDROCK=<your Bedrock API key>
AWS_REGION=eu-north-1
BEDROCK_MODEL_ID=qwen.qwen3-coder-480b-a35b-instruct
AI_DAILY_LIMIT=2000
PORT=3001
DB_PATH=/var/lib/gio/gio.db
TRUST_PROXY=2
```

`TRUST_PROXY=2` tells GIO it sits behind two proxies (the HTTPS distribution and nginx), so per-visitor rate limits see the real visitor's address. Then start it:

```
sudo systemctl start gio
curl http://127.0.0.1:3001/api/health
```

## 3. Updating

```
sudo bash /opt/gio/app/deploy/update.sh
```

## Cost safety

`AI_DAILY_LIMIT` caps AI requests for the whole site per day, on top of the per-visitor limit, so a busy public link can't use up the AI budget.
