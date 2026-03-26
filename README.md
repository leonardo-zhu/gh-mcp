# GitHub App Token MCP Server

This is a Model Context Protocol (MCP) server that provides a single tool: `get_installation_token`.
It allows AI Agents to authenticate as your GitHub App and generate an installation access token to perform actions on your repositories.

## Setup

1. Make sure you have Node.js installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Environment Variables

The server requires the following environment variables to authenticate as your GitHub App:

- `GITHUB_APP_ID`: **(Required)** The App ID of your GitHub App.
- `GITHUB_PRIVATE_KEY`: **(Required)** The private key of your GitHub App. (Can contain `\n` for multiline).
- `GITHUB_INSTALLATION_ID`: *(Optional)* The default Installation ID where your app is installed. If set, agents won't need to provide it as an argument.
- `GITHUB_CLIENT_ID`: *(Optional)* The Client ID of your GitHub App.
- `GITHUB_CLIENT_SECRET`: *(Optional)* The Client Secret of your GitHub App.

## Usage in MCP Clients (e.g., Claude Desktop, Cursor)

You can add this MCP server to your client's configuration file.
Ensure the environment variables are correctly populated.

**Example for Claude Desktop (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "github-app-auth": {
      "command": "node",
      "args": [
        "/absolute/path/to/dist/index.js"
      ],
      "env": {
        "GITHUB_APP_ID": "your_app_id",
        "GITHUB_PRIVATE_KEY": "-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----",
        "GITHUB_INSTALLATION_ID": "your_installation_id"
      }
    }
  }
}
```

## Tools Provided

- **`get_installation_token`**: Generates a short-lived GitHub API token.
  - **Inputs:** `installationId` (optional, fallbacks to `GITHUB_INSTALLATION_ID` environment variable).
  - **Outputs:** The plain token as text, which can then be used in standard Authorization headers (`Authorization: Bearer <token>`).
