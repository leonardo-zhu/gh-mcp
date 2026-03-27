import type { AuthInstance } from "../types.js";
import type { TokenCache } from "./cache.js";
import { config } from "../config.js";

export function resolveInstallationId(installationId?: number): number | null {
  return installationId || (config.defaultInstallationId ? Number(config.defaultInstallationId) : null);
}

export async function fetchAndCacheToken(auth: AuthInstance, tokenCache: TokenCache, installationId: number): Promise<string> {
  const authResponse = (await auth({
    type: "installation",
    installationId,
  })) as unknown as { token: string; expires_at: string; expiresAt?: string };

  const expiresStr = authResponse.expiresAt || authResponse.expires_at;

  console.error(`[GitHub Auth] Token obtained. Raw expiration string: ${expiresStr}`);
  tokenCache.set(installationId, authResponse.token, expiresStr!);

  return authResponse.token;
}
