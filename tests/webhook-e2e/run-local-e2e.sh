#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env in repo root"
  exit 1
fi

PAYLOAD_FILE="${1:-tests/webhook-e2e/payload.sample.json}"
MCP_PORT="${MCP_PORT:-3102}"
MCP_HOST="${MCP_HOST:-127.0.0.1}"
TARGET_PATH="${WEBHOOK_PROXY_PATH:-/gh-webhook}"

if [[ ! -f "$PAYLOAD_FILE" ]]; then
  echo "Payload file not found: $PAYLOAD_FILE"
  exit 1
fi

SECRET="$(awk -F= '/^GITHUB_WEBHOOK_SECRET=/{print $2}' .env | tail -n 1)"
if [[ -z "${SECRET}" ]]; then
  echo "Missing GITHUB_WEBHOOK_SECRET in .env"
  exit 1
fi

rm -f /tmp/ghmcp-e2e-server.log /tmp/ghmcp-e2e-mock.log /tmp/ghmcp-e2e-response.json

cleanup() {
  if [[ -n "${MCP_PID:-}" ]]; then kill "$MCP_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "${MOCK_PID:-}" ]]; then kill "$MOCK_PID" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

node tests/webhook-e2e/mock-openclaw.js >/tmp/ghmcp-e2e-mock.log 2>&1 &
MOCK_PID=$!

node dist/index.js --sse --host="$MCP_HOST" --port="$MCP_PORT" >/tmp/ghmcp-e2e-server.log 2>&1 &
MCP_PID=$!

sleep 2

SIG="sha256=$(openssl dgst -sha256 -hmac "$SECRET" "$PAYLOAD_FILE" | sed 's/^.* //')"

HTTP_STATUS="$(curl -s -o /tmp/ghmcp-e2e-response.json -w "%{http_code}" -X POST "http://${MCP_HOST}:${MCP_PORT}${TARGET_PATH}" \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: pull_request' \
  -H 'X-GitHub-Delivery: local-e2e-001' \
  -H "X-Hub-Signature-256: ${SIG}" \
  --data-binary @"$PAYLOAD_FILE")"

echo "HTTP_STATUS=${HTTP_STATUS}"
echo "--- PROXY RESPONSE ---"
cat /tmp/ghmcp-e2e-response.json
echo
echo "--- MCP LOG ---"
sed -n '1,120p' /tmp/ghmcp-e2e-server.log
echo
echo "--- MOCK OPENCLAW LOG ---"
sed -n '1,200p' /tmp/ghmcp-e2e-mock.log
