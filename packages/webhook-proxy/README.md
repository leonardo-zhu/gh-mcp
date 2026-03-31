# `@gh-mcp/webhook-proxy`

Webhook proxy utilities for receiving GitHub App webhook deliveries, verifying `X-Hub-Signature-256`, and forwarding payloads to an OpenClaw webhook endpoint.

## Environment variables

- `GITHUB_WEBHOOK_SECRET`: GitHub App webhook secret.
- `OPENCLAW_WEBHOOK_URL`: Full OpenClaw webhook URL (for example `https://example.com/hooks/github`).
- `OPENCLAW_HOOKS_TOKEN`: OpenClaw hooks token forwarded as `Authorization: Bearer <token>`.
- `WEBHOOK_PROXY_PATH` (optional): Route path on Express, default `/gh-webhook`.
- `WEBHOOK_PROXY_BODY_LIMIT` (optional): Request body limit, default `1mb`.
