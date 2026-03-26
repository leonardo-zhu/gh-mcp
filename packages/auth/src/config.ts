import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { AppConfig } from "./types.js";

// The final bundled index.js will live in /gh-mcp/dist/index.js
// So resolving ../.env points correctly to /gh-mcp/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

function loadPrivateKey(keyOrPath?: string): string | undefined {
  if (!keyOrPath) return undefined;

  // If it doesn't contain a typical private key header, treat it as a path
  if (!keyOrPath.includes("-----BEGIN")) {
    try {
      return fs.readFileSync(keyOrPath, "utf-8");
    } catch (err: any) {
      console.error(`ERROR: Could not read private key from path ${keyOrPath}: ${err.message}`);
      process.exit(1);
    }
  }

  // Handle literal multiline string
  return keyOrPath.replace(/\\n/g, '\n');
}

export const config: AppConfig = {
  get appId() {
    const val = process.env.GITHUB_APP_ID;
    if (!val) {
      console.error("ERROR: GITHUB_APP_ID environment variable is required.");
      process.exit(1);
    }
    return val;
  },
  get privateKey() {
    const val = loadPrivateKey(process.env.GITHUB_PRIVATE_KEY_PATH || process.env.GITHUB_PRIVATE_KEY);
    if (!val) {
      console.error("ERROR: GITHUB_PRIVATE_KEY or GITHUB_PRIVATE_KEY_PATH environment variable is required.");
      process.exit(1);
    }
    return val;
  },
  get defaultInstallationId() { return process.env.GITHUB_INSTALLATION_ID; },
  get clientId() { return process.env.GITHUB_CLIENT_ID; },
};
