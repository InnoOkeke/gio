#!/usr/bin/env bash
# Starts GIO. The Bedrock API key is read from AWS Systems Manager Parameter Store at start-up
# using the server's IAM role, so it is never written to disk. Run by the gio systemd service.
set -euo pipefail

if [ -z "${AWS_BEARER_TOKEN_BEDROCK:-}" ]; then
  if [ -z "${GIO_SECRET_PARAM:-}" ]; then
    echo "Set GIO_SECRET_PARAM (the Parameter Store name of the Bedrock API key) in /etc/gio/gio.env" >&2
    exit 1
  fi
  if ! AWS_BEARER_TOKEN_BEDROCK="$(aws ssm get-parameter --name "$GIO_SECRET_PARAM" --with-decryption \
      --region "$AWS_REGION" --query Parameter.Value --output text 2>/tmp/gio-ssm-error)"; then
    echo "Could not read $GIO_SECRET_PARAM from Parameter Store: $(cat /tmp/gio-ssm-error)" >&2
    exit 1
  fi
  export AWS_BEARER_TOKEN_BEDROCK
fi

cd /opt/gio/app
exec /usr/local/bin/node dist/api/server.js
