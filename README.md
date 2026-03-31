# GitHub App MCP Monorepo

Welcome to the **GitHub App MCP Monorepo**. This project provides a robust, modular suite of [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers specifically designed to empower AI Agents with secure, GitHub App-based authentication and repository interaction capabilities.

## 🏗️ Project Structure

This repository is managed as a `pnpm` workspace:

- **[`packages/auth`](./packages/auth)**: A modular library handling GitHub App authentication. It registers the `get_installation_token` tool, which leverages `@octokit/auth-app` and maintains a robust in-memory token cache.
- **[`packages/server`](./packages/server)**: The primary entry point. It initializes a global MCP server, mounts tools from the `auth` package, and provides a Stdio transport interface for integration with AI clients.
- **[`packages/webhook-proxy`](./packages/webhook-proxy)**: Verifies GitHub webhook signatures and forwards payloads to OpenClaw hooks endpoints.

## 🔗 Integration Docs

- [OpenClaw Webhook Proxy Integration](./docs/openclaw-webhook-proxy.md): end-to-end setup for GitHub App webhook -> gh-mcp proxy -> OpenClaw mapped hooks.
- [Webhook E2E Local Test](./tests/webhook-e2e/README.md): reusable local signed-webhook test with mock OpenClaw.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (highly recommended for workspace management)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/leonardo-zhu/gh-mcp.git
   cd gh-mcp
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build the entire project:
   ```bash
   pnpm build
   ```

## ⚙️ Configuration

The server relies on environment variables for GitHub App authentication. You can define these in your system or within your MCP client configuration:

| Variable                 | Description                                       | Required |
| :----------------------- | :------------------------------------------------ | :------: |
| `GITHUB_APP_ID`          | Your GitHub App ID                                |    ✅    |
| `GITHUB_PRIVATE_KEY`     | Your GitHub App's private key (content, not path) |    ✅    |
| `GITHUB_INSTALLATION_ID` | Default Installation ID for the app               |    ❌    |
| `GITHUB_CLIENT_ID`       | Your GitHub App Client ID                         |    ❌    |

> [!TIP]
> Use `\n` to represent newlines in the `GITHUB_PRIVATE_KEY` if your configuration format (like JSON) requires a single line.

## 🤖 Usage with AI Clients

#### Local Usage (Stdio)

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gh-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/gh-mcp/dist/index.js"],
      "env": {
        "GITHUB_APP_ID": "...",
        "GITHUB_PRIVATE_KEY": "...",
        "GITHUB_INSTALLATION_ID": "..."
      }
    }
  }
}
```

#### Remote Usage (SSE)

To run the server in HTTP mode for remote access:

1. Start the server on your backend:
   ```bash
   node /path/to/gh-mcp/dist/index.js --sse --port=3000
   ```
2. Configure your local client to use the SSE endpoint:
   - **URL**: `http://your-server-ip:3000/gh-mcp`

You can also start it from the repo root after build:

```bash
pnpm start:sse
```

> [!NOTE]
> All logs in both modes are directed to `stderr` to avoid corrupting the Stdio MCP protocol stream.

## 🛠️ Tools Provided

### `get_installation_token`

Generates a short-lived GitHub Installation Access Token (IAT).

- **Arguments**: `installationId` (optional number).
- **Returns**: A plain-text token.

---

## 🚢 Auto Deploy On `master`

This repository includes a GitHub Actions workflow that deploys automatically when `master` is updated:

- Workflow file: `.github/workflows/deploy-master.yml`
- Trigger: `push` to `master` (and manual `workflow_dispatch`)

Create these repository secrets before enabling it:

- `DEPLOY_SSH_HOST`: target server IP/domain
- `DEPLOY_SSH_PORT`: SSH port (optional, defaults to `22`)
- `DEPLOY_SSH_USER`: SSH username
- `DEPLOY_SSH_PRIVATE_KEY`: private key content used by GitHub Actions
- `DEPLOY_PATH`: absolute path of the repo on your server (for example `/srv/gh-mcp`)
- `DEPLOY_BRANCH`: branch to deploy (optional, defaults to `master`)
- `DEPLOY_RESTART_CMD`: restart command on your server (for example `pm2 restart gh-mcp`)

What the deploy job does on your server:

1. `git fetch --all --prune`
2. `git checkout <branch>`
3. `git reset --hard origin/<branch>`
4. `pnpm install --frozen-lockfile`
5. `pnpm build`
6. Run `DEPLOY_RESTART_CMD`

_Built with ❤️ by Antigravity._
