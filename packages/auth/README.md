# `@gh-mcp/auth`

The `@gh-mcp/auth` package is a modular library that provides GitHub App-based authentication tools for the Model Context Protocol (MCP).

## ✨ Features

- **GitHub App Auth**: Seamless integration with `@octokit/auth-app`.
- **Token Caching**: Intelligent in-memory token cache to minimize unnecessary API calls.
- **MCP Integration**: Designed to be registered on any `McpServer` instance.

## 🛠️ Tools

### `get_installation_token`
- **Description**: Generates a short-lived GitHub Installation Access Token (IAT) for the given installation ID.
- **Parameters**: `installationId` (optional number).
- **Behavior**: Falls back to the `GITHUB_INSTALLATION_ID` environment variable if no argument is provided.

## ⚙️ How it Works

The package focuses on securing and streamlining GitHub authentication:
1.  **Configuration**: Configured via environment variables (`GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, etc.).
2.  **Auth Registration**: Use `registerAuthTools(server: McpServer)` to add its authentication tools to your MCP server.
3.  **Token Lifecycle**: Each installation ID has its own short-lived token generated and cached until expiration.

## 🚀 Built-In Support

- **Runtime**: Node.js
- **Ecosystem**: Model Context Protocol (MCP)

---
*Built with ❤️ by Antigravity.*
