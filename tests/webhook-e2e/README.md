# Webhook E2E Local Test

This folder provides a reusable local end-to-end test for:

- GitHub-style webhook request
- gh-mcp webhook proxy (`/gh-webhook` by default)
- forwarding to a mock OpenClaw endpoint (`/hooks/github`)

## Files

- `mock-openclaw.js`: temporary local OpenClaw mock server
- `payload.sample.json`: sample webhook payload
- `run-local-e2e.sh`: one-command test script

## Usage

From repo root:

```bash
pnpm build
bash tests/webhook-e2e/run-local-e2e.sh
```

Use a custom payload:

```bash
bash tests/webhook-e2e/run-local-e2e.sh /path/to/payload.json
```

## Requirements

- Root `.env` must include `GITHUB_WEBHOOK_SECRET`
- `dist/index.js` must exist (run `pnpm build`)

## Expected result

- Script prints `HTTP_STATUS=202`
- Proxy response includes `"forwarded": true`
- Mock log shows `Authorization: Bearer ...` and received payload
