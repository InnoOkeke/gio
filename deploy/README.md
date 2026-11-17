# Deploying GIO

GIO runs on one small server: Node.js serves the API and the built UI on port 3001, nginx forwards port 80 to it, and an Amazon API Gateway HTTP API in front provides the public **HTTPS** address. HTTPS is required: browsers only allow the microphone, speech recognition and the clipboard on secure sites.

## Reference deployment (AWS, `eu-north-1`)

| Piece | Purpose |
|---|---|
| EC2 `t3.micro`, Amazon Linux 2023, 20 GB encrypted gp3 | Runs GIO; SQLite lives at `/var/lib/gio/gio.db`. CPU credits in *standard* mode, so there are no surprise surplus charges. IMDSv2 required. |
| Elastic IP | A stable public DNS name for API Gateway to reach the server |
| Security group | Only port 80. No SSH: the server is managed with AWS Systems Manager. |
| Origin secret (`/etc/gio/nginx-origin.conf`, root-only, not in git) | nginx returns 403 to any request without the secret `x-gio-origin` header that API Gateway adds, so the server only answers through API Gateway. |
| IAM role (instance profile) | Systems Manager access, plus read access to one Parameter Store value: the Bedrock API key |
| Parameter Store `SecureString` `gio-bedrock-api-key` | The Bedrock API key, encrypted. Read at start-up and kept only in memory. |
| API Gateway HTTP API | Public HTTPS address. One `$default` route, an `HTTP_PROXY` integration that forwards the full path (`overwrite:path = $request.path`) and adds the origin secret header, 30-second timeout, throttled to 50 requests/second (burst 100). |

API Gateway reports the visitor's address in a `Forwarded: ...;for=<ip>` header and sends no `X-Forwarded-For`. nginx copies that address into `X-Forwarded-For`, and the app trusts one proxy hop (`TRUST_PROXY=1`), so per-visitor rate limits use the real visitor.

## Setup

1. Launch the instance with `deploy/setup.sh` as user data. It installs Node 22 (checksum-verified) and nginx, builds GIO from GitHub, writes the non-secret settings in `/etc/gio/gio.env` (from `deploy/gio.env.example`), and starts a hardened `gio` systemd service.
2. Store the Bedrock API key in Parameter Store as a `SecureString` named `gio-bedrock-api-key`, in the same Region. The service retries every 10 seconds, so GIO starts serving within a few seconds of the key being saved.
3. Create the origin secret on the server (as root):
   ```
   s=$(openssl rand -hex 32)
   printf 'if ($http_x_gio_origin != "%s") { return 403; }\n' "$s" > /etc/gio/nginx-origin.conf
   chmod 600 /etc/gio/nginx-origin.conf && nginx -t && systemctl reload nginx
   ```
4. Create the HTTP API with an `HTTP_PROXY` integration to `http://<instance public DNS>`, request parameters `overwrite:path` = `$request.path` and `append:header.x-gio-origin` = the secret, a `$default` route, and an auto-deployed `$default` stage.

## Updating

Run as root on the server, for example with Systems Manager Run Command:

```
bash /opt/gio/app/deploy/update.sh
```

## Rotating secrets

- **Bedrock API key:** save the new key to the same parameter (overwrite), then `systemctl restart gio`.
- **Origin secret:** write a new `/etc/gio/nginx-origin.conf` (step 3) and update the integration's `append:header.x-gio-origin` value to match.

## Cost safety

`AI_DAILY_LIMIT` caps AI requests for the whole site per day, on top of the per-visitor limit, so a busy public link can't use up the AI budget. API Gateway throttling caps total request rate.
