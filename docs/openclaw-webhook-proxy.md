# OpenClaw Webhook Proxy Integration

This guide documents how to connect a **GitHub App webhook** to **OpenClaw hooks** using this repository's Express HTTP server.

## Architecture

```text
GitHub App Webhook (POST)
  -> gh-mcp Express route: /gh-webhook
  -> verify X-Hub-Signature-256
  -> forward to OpenClaw: /hooks/github
  -> OpenClaw hooks.mappings -> action: "agent" (or "wake")
```

Why proxy is needed:

- GitHub webhook authentication is based on `X-Hub-Signature-256` + webhook secret.
- OpenClaw hook authentication requires `Authorization: Bearer <hooks.token>` (or `x-openclaw-token`).
- GitHub does not attach OpenClaw's token format automatically, so a relay/proxy layer is required.

## What Exists In This Repo

- Proxy package: `packages/webhook-proxy`
- Server integration: `packages/server/src/index.ts`
- Default webhook route: `POST /gh-webhook` (only when running `--sse` HTTP mode)

The MCP JSON-RPC endpoint remains isolated at:

- `/gh-mcp`

GitHub webhook traffic does **not** need JSON-RPC and does not hit `/gh-mcp`.

## Environment Variables

Set these in your runtime environment (or `.env`):

```env
# Existing auth variables for GitHub App IAT tools
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY_PATH=...
GITHUB_INSTALLATION_ID=...

# Webhook proxy variables
GITHUB_WEBHOOK_SECRET=your_github_app_webhook_secret
OPENCLAW_WEBHOOK_URL=http://127.0.0.1:18789/hooks/github
OPENCLAW_HOOKS_TOKEN=your_openclaw_hooks_token

# Optional
WEBHOOK_PROXY_PATH=/gh-webhook
WEBHOOK_PROXY_BODY_LIMIT=1mb
```

## OpenClaw Configuration (Mapped Endpoint)

Proxy forwarding should target `POST /hooks/<name>` (for example `/hooks/github`), and OpenClaw should map that path.

Example `~/.openclaw/openclaw.json` snippet:

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    path: "/hooks",

    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
    allowedAgentIds: ["hooks", "main"],

    mappings: [
      {
        match: { path: "github" },
        action: "agent",
        name: "GitHub",
        agentId: "hooks",
        wakeMode: "now",
        sessionKey: "hook:github:{{repository.full_name}}:{{pull_request.number}}",
        messageTemplate:
          "GitHub webhook received.\n" +
          "action={{action}}\n" +
          "repo={{repository.full_name}}\n" +
          "pr={{pull_request.number}} {{pull_request.title}}\n" +
          "sender={{sender.login}}\n" +
          "Please review this update and summarize key changes and risks.",
        deliver: false
      }
    ]
  }
}
```

Notes:

- OpenClaw webhook base path is `/hooks` (plural).
- `OPENCLAW_WEBHOOK_URL` should usually be `/hooks/github` for mapped behavior.
- If you use `/hooks/agent` directly, payload format must match OpenClaw `agent` schema (`message`, etc.).

## GitHub App Webhook Settings

In GitHub App settings:

- Webhook URL: `https://<your-public-host>/gh-webhook`
- Webhook secret: must match `GITHUB_WEBHOOK_SECRET`
- Events: choose required events (for PR automation usually `pull_request`, optionally `check_run`, `workflow_run`)

## Run & Local Debug

### 1) Build and run HTTP mode

```bash
pnpm install
pnpm build
node dist/index.js --sse --host=0.0.0.0 --port=3000
```

Expected startup logs include:

- MCP endpoint: `http://<host>:3000/gh-mcp`
- health: `http://<host>:3000/healthz`
- webhook proxy: `/gh-webhook` enabled

### 2) Simulate GitHub webhook with curl

Create payload:

```bash
cat > payload.json <<'JSON'
{
  "action": "opened",
  "repository": { "full_name": "owner/repo" },
  "pull_request": { "number": 42, "title": "feat: add webhook flow" },
  "sender": { "login": "octocat" }
}
JSON
```

Compute signature and send:

```bash
SECRET='your_github_app_webhook_secret'
SIG="sha256=$(openssl dgst -sha256 -hmac "$SECRET" payload.json | sed 's/^.* //')"

curl -i -X POST 'http://127.0.0.1:3000/gh-webhook' \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: pull_request' \
  -H 'X-GitHub-Delivery: test-delivery-001' \
  -H "X-Hub-Signature-256: $SIG" \
  --data-binary @payload.json
```

Expected response:

- Success forwarding: HTTP `202` with `{"ok":true,"forwarded":true,...}`
- Duplicate delivery id: HTTP `202` with `{"ok":true,"deduplicated":true}`
- Invalid signature: HTTP `401`

## Troubleshooting

- `401 Invalid webhook signature`
  - Ensure webhook secret in GitHub App equals `GITHUB_WEBHOOK_SECRET`.
  - Ensure signature is computed from raw body bytes.

- `502 OpenClaw webhook forwarding failed`
  - Verify `OPENCLAW_WEBHOOK_URL` is reachable from proxy host.
  - Verify OpenClaw `hooks.enabled=true` and token matches `OPENCLAW_HOOKS_TOKEN`.

- GitHub delivery shows timeout/failure
  - Verify public reachability of `/gh-webhook`.
  - Check reverse proxy/TLS and firewall.

## References

- OpenClaw webhooks: `https://docs.openclaw.ai/automation/webhook#endpoints`
- OpenClaw hooks config: `https://docs.openclaw.ai/gateway/configuration-reference`
- GitHub webhook events/payloads: `https://docs.github.com/en/webhooks/webhook-events-and-payloads`
- GitHub webhook signature validation: `https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries`
