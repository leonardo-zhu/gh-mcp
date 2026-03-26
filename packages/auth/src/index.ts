import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// removed StdioServerTransport execution logic from the library
import { createAppAuth } from "@octokit/auth-app";
import { z } from "zod";
import { config } from "./config.js";
import { TokenCache } from "./cache.js";

// The auth-specific exported function that registers its utility to any given server
export function registerAuthTools(server: McpServer) {
// Prepare GitHub auth instance
  // Config getter will inherently throw if appId or privateKey are missing.
  // Prepare GitHub auth instance
  const authOptions = {
    appId: config.appId,
    privateKey: config.privateKey,
    ...(config.clientId ? { clientId: config.clientId } : {}),
  };

  const auth = createAppAuth(authOptions);
  const tokenCache = new TokenCache();

  // Register tool using the new McpServer format + Zod
  server.tool(
  "get_installation_token",
  "Get a GitHub installation access token using the GitHub App's credentials.",
  {
    installationId: z.number().optional().describe("Optional installation ID. If not provided, it uses the GITHUB_INSTALLATION_ID env var."),
  },
  async ({ installationId }) => {
    const targetInstallationId = installationId || (config.defaultInstallationId ? Number(config.defaultInstallationId) : null);

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

    // Check cache first
    const cachedToken = tokenCache.get(targetInstallationId);
    if (cachedToken) {
      return {
        content: [{ type: "text", text: cachedToken }],
      };
    }

    try {
      const authResponse = (await auth({
        type: "installation",
        installationId: targetInstallationId,
      })) as unknown as { token: string; expires_at: string; expiresAt?: string };

      const expiresStr = authResponse.expiresAt || authResponse.expires_at;

      // Update cache
      console.error(`[GitHub Auth] Token received. Raw expiration string: ${expiresStr}`);
      tokenCache.set(targetInstallationId, authResponse.token, expiresStr!);

      return {
        content: [{ type: "text", text: authResponse.token }],
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
