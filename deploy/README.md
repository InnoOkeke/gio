# Deploying GIO

GIO runs on one small server: Node.js serves the API and the built UI on port 3001, nginx forwards port 80 to it, and Amazon CloudFront in front provides the public **HTTPS** address. HTTPS is required: browsers only allow the microphone, speech recognition and the clipboard on secure sites.

## Reference deployment (AWS, `eu-north-1`)

| Piece | Purpose |
|---|---|
| EC2 `t3.micro`, Amazon Linux 2023, 20 GB encrypted gp3 | Runs GIO; SQLite lives at `/var/lib/gio/gio.db`. CPU credits in *standard* mode, so there are no surprise surplus charges. |
| Elastic IP | A stable public DNS name for CloudFront to reach the server |
| Security group | Only port 80, and only from CloudFront's origin-facing IP list. No SSH: the server is managed with AWS Systems Manager. |
| IAM role (instance profile) | Systems Manager access, plus read access to one Parameter Store value: the Bedrock API key |
| Parameter Store `SecureString` `gio-bedrock-api-key` | The Bedrock API key, encrypted. Read at start-up and kept only in memory. |
| CloudFront distribution | Public HTTPS address, HTTP→HTTPS redirect, caching only for `/assets/*` |

## Setup

1. Launch the instance with `deploy/setup.sh` as user data. It installs Node 22 (checksum-verified) and nginx, builds GIO from GitHub, writes the non-secret settings in `/etc/gio/gio.env` (from `deploy/gio.env.example`), and starts a hardened `gio` systemd service.
2. Store the Bedrock API key in Parameter Store as a `SecureString` named `gio-bedrock-api-key`, in the same Region. The service retries every 10 seconds, so GIO starts serving within a few seconds of the key being saved.

## Updating

Run as root on the server, for example with Systems Manager Run Command:

```
bash /opt/gio/app/deploy/update.sh
```

## Rotating the API key

Save the new key to the same parameter (overwrite), then restart: `systemctl restart gio`.

## Cost safety

`AI_DAILY_LIMIT` caps AI requests for the whole site per day, on top of the per-visitor limit, so a busy public link can't use up the AI budget.
