import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AuthInstance } from "../types.js";
import type { TokenCache } from "../utils/cache.js";
import { resolveInstallationId, fetchAndCacheToken } from "../utils/fetch-token.js";

export function registerRefreshInstallationToken(server: McpServer, auth: AuthInstance, tokenCache: TokenCache) {
  server.tool(
  "refresh_installation_token",
  "Force-refresh a GitHub installation access token, bypassing the cache. Useful when token permissions have changed or the current token has been revoked.",
  {
    installationId: z.number().optional().describe("Optional installation ID. If not provided, it uses the GITHUB_INSTALLATION_ID env var."),
  },
  async ({ installationId }) => {
    const targetInstallationId = resolveInstallationId(installationId);

    if (!targetInstallationId) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Installation ID must be provided either as an argument or via GITHUB_INSTALLATION_ID environment variable.",
          },
        ],
      };
    }

    try {
      const token = await fetchAndCacheToken(auth, tokenCache, targetInstallationId);
      return {
        content: [{ type: "text", text: token }],
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to refresh GitHub App installation token: ${errorMessage}`,
          },
        ],
      };
    }
  });
}
