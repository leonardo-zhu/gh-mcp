import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AuthInstance } from "../types.js";
import type { TokenCache } from "../utils/cache.js";
import { resolveInstallationId, fetchAndCacheToken } from "../utils/fetch-token.js";

export function registerGetInstallationToken(server: McpServer, auth: AuthInstance, tokenCache: TokenCache) {
  server.tool(
  "get_installation_token",
  "Get a GitHub installation access token using the GitHub App's credentials.",
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

    const cachedToken = tokenCache.get(targetInstallationId);
    if (cachedToken) {
      return {
        content: [{ type: "text", text: cachedToken }],
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
            text: `Failed to fetch GitHub App installation token: ${errorMessage}`,
          },
        ],
      };
    }
  });
}
