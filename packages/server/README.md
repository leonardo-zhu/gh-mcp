# `@gh-mcp/server`

The `@gh-mcp/server` package is the primary entry point for the **GitHub App MCP Server**. This executable server mounts all available tools from the workspace to provide a single interface for AI clients.

## ✨ Features

- **Standardized Transport**: Uses the Model Context Protocol (MCP) Stdio transport for seamless integration with clients like Claude Desktop and Cursor.
- **Global Tool Registration**: Imports and registers tools from `@gh-mcp/auth`.
- **Easy Deployment**: Can be run as a standalone binary after building.

## 🚀 Execution

The server is intended to be run via Node.js:

```bash
# From the project root
pnpm build
node packages/server/dist/index.js
```

### Development

To start the server in watch mode:

```bash
# From the project root
pnpm build --watch
```

## ⚙️ Configuration

The server requires proper environment variables to authenticate as a GitHub App and serve tokens.

| Variable | Description |
| :--- | :--- |
| `GITHUB_APP_ID` | Your GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Your GitHub App's private key content |
| `GITHUB_INSTALLATION_ID` | Default Installation ID (optional) |

---
*Built with ❤️ by Antigravity.*
