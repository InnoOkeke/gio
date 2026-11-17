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

## Backups (daily EBS snapshots)

Amazon Data Lifecycle Manager (DLM) takes one snapshot of the GIO volume every day and deletes all but the newest 7. DLM itself is free; you pay only for snapshot storage.

### What exists (`eu-north-1`, account `288229084544`)

| Item | Value |
|---|---|
| DLM policy | `policy-06c6b97075d99049a`, type `EBS_SNAPSHOT_MANAGEMENT`, state `ENABLED`, tag `project=gio` |
| Target | Any volume tagged `project=gio`. Today that is `vol-0e5daf2163efc5315`, the 20 GB encrypted gp3 root volume of `i-0f8305e16a98cc152`. |
| Schedule | `daily`: every 24 hours, starting at 03:00 UTC |
| Retention | Last 7 snapshots (count-based) |
| Snapshot tags | `project=gio`, `managed-by=dlm`, plus the volume's tags (`CopyTags`) |
| IAM role | `gio-dlm-lifecycle-role`, tagged `project=gio`. The trust policy allows only `dlm.amazonaws.com`, and only when `aws:SourceAccount` is the project account and `aws:SourceArn` matches `arn:aws:dlm:eu-north-1:288229084544:policy/*`. The inline policy `gio-dlm-snapshots` allows describing volumes, instances and snapshots, creating snapshots and tags, and deleting only snapshots tagged `project=gio`. |

The service-linked role was not used. A custom role lets us scope deletion to `project=gio` snapshots and add the confused-deputy conditions.

New volumes are covered automatically if you tag them `project=gio`. Untagged volumes are not backed up.

### Restore from a snapshot

1. List snapshots, newest first:
   ```
   aws ec2 describe-snapshots --owner-ids self --filters Name=tag:project,Values=gio --query "sort_by(Snapshots,&StartTime)[].[SnapshotId,StartTime,State,VolumeId]" --output table --profile hyperrevive --region eu-north-1
   ```
2. Create a volume from the snapshot in the instance's Availability Zone (the encryption setting carries over from the snapshot):
   ```
   aws ec2 create-volume --snapshot-id <snap-id> --availability-zone <az of the instance> --volume-type gp3 --tag-specifications "ResourceType=volume,Tags=[{Key=project,Value=gio-restore}]" --profile hyperrevive --region eu-north-1
   ```
   The new volume is tagged `gio-restore` on purpose, so DLM does not start snapshotting it before you decide to keep it. Retag it `project=gio` once it is in service.
3. Either attach it to a stopped instance as a second disk and copy `/var/lib/gio/gio.db` over the live one, or stop the instance and swap it in as the root device (`/dev/xvda`). Copying the one file is the lower-risk option.
4. Before using a restored `gio.db`, run `sqlite3 gio.db "PRAGMA integrity_check;"` (it should print `ok`). Keep any `gio.db-wal` file that came from the same snapshot next to it, so SQLite can replay it on open.
5. Start the `gio` service and check `/api/health`.

### List, pause and disable

```
aws dlm get-lifecycle-policies --profile hyperrevive --region eu-north-1
aws dlm get-lifecycle-policy --policy-id policy-06c6b97075d99049a --profile hyperrevive --region eu-north-1
aws dlm update-lifecycle-policy --policy-id policy-06c6b97075d99049a --state DISABLED --profile hyperrevive --region eu-north-1
aws dlm delete-lifecycle-policy --policy-id policy-06c6b97075d99049a --profile hyperrevive --region eu-north-1
```

Disabling or deleting the policy stops new snapshots, and existing snapshots are no longer pruned. They stay (and keep costing money) until you delete them with `aws ec2 delete-snapshot`.

### Cost

EBS snapshots are incremental and billed per GB-month of stored changed blocks. The first snapshot holds the used blocks of the 20 GB volume (less than 20 GB, since EBS bills only data written). Each later snapshot adds only the changes. Seven snapshots of a small, lightly written volume should add up to roughly the size of the data plus a week of churn, so expect cents to low single-digit dollars per month. Check the current rate on the [EBS pricing page](https://aws.amazon.com/ebs/pricing/). This is a cost estimate, not a measurement; look at the Billing and Cost Management console after a week.

### SQLite consistency decision

A snapshot of a running volume is **crash-consistent**: it captures the disk as if the power had been cut at that moment. It is not application-consistent, because nothing flushes or pauses SQLite first.

**Decision: acceptable, with no freeze or stop step.** Reasons:

- SQLite is designed to survive power loss. With `journal_mode = WAL` (set in `src/db/client.ts`) and the default `synchronous = FULL`, a commit is durable once written to the `-wal` file. On the next open, SQLite replays the valid commits in the `-wal` file and ignores any partial one. A restored snapshot therefore opens at the last complete transaction before the snapshot.
- EBS snapshots are point-in-time for the whole volume, so `gio.db`, `gio.db-wal` and `gio.db-shm` are all captured at the same instant. That matters: the `-wal` file lives on the same volume as the database, so the pair stays consistent. Copying the files one at a time from a running system would not give that guarantee.
- GIO's data is small, low-write (saved Logo projects) and loses at most the last in-flight write plus up to 24 hours of changes (the backup interval). That is acceptable for this app.

Caveats:

- Do not restore only `gio.db` and discard its `-wal` file. Commits not yet checkpointed into the main file would be lost, and in rare cases that leaves a stale database. Keep the files together, or restore the whole volume.
- Crash-consistent depends on the filesystem too. The root volume uses a journaling filesystem (XFS on Amazon Linux 2023), which recovers on mount.
- Always run `PRAGMA integrity_check;` after a restore, as in the steps above.
- If GIO later holds data that must never lose the last few seconds, or the write rate grows, add a pre-snapshot step (for example a DLM pre/post script that runs `sqlite3 gio.db "PRAGMA wal_checkpoint(TRUNCATE);"`, or `sqlite3 gio.db ".backup"` to a file) to get an application-consistent copy.