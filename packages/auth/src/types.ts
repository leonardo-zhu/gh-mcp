import type { createAppAuth } from "@octokit/auth-app";

export interface AppConfig {
  appId: string;
  privateKey: string;
  defaultInstallationId?: string;
  clientId?: string;
}

export type AuthInstance = ReturnType<typeof createAppAuth>;
