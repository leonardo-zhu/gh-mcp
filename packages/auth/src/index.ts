import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAppAuth } from "@octokit/auth-app";
import { config } from "./config.js";
import { TokenCache } from "./utils/cache.js";
import { registerGetInstallationToken } from "./tools/get-installation-token.js";
import { registerRefreshInstallationToken } from "./tools/refresh-installation-token.js";

export function registerAuthTools(server: McpServer) {
  const authOptions = {
    appId: config.appId,
    privateKey: config.privateKey,
    ...(config.clientId ? { clientId: config.clientId } : {}),
  };

  const auth = createAppAuth(authOptions);
  const tokenCache = new TokenCache();

  registerGetInstallationToken(server, auth, tokenCache);
  registerRefreshInstallationToken(server, auth, tokenCache);
}
