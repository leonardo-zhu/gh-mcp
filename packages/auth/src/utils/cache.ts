import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface CachedToken {
  token: string;
  expiresAt: number;
}

const TOKEN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Now the cache file will be created in the same directory as the compiled/bundled script (e.g., dist/)
const CACHE_FILE = path.resolve(__dirname, "./.token-cache.json");

export class TokenCache {
  private readCache(): Record<number, CachedToken> {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, "utf-8");
        return JSON.parse(data);
      }
    } catch (err) {
      console.error(`[TokenCache] Failed to read cache file: ${err}`);
    }
    return {};
  }

  private writeCache(cache: Record<number, CachedToken>): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
    } catch (err) {
      console.error(`[TokenCache] Failed to write cache file: ${err}`);
    }
  }

  get(installationId: number): string | null {
    const cache = this.readCache();
    const entry = cache[installationId];
    if (!entry) return null;

    const now = Date.now();
    // Return token only if it's still valid with at least TOKEN_BUFFER_MS remaining
    if (entry.expiresAt > now + TOKEN_BUFFER_MS) {
      return entry.token;
    }

    return null;
  }

  set(installationId: number, token: string, expiresAtStr: string): void {
    let expiresAt = new Date(expiresAtStr).getTime();
    
    // Defensive check: if parsing failed (NaN), default to 55 minutes from now 
    // (a safe bet for GitHub tokens which usually last 60m)
    if (isNaN(expiresAt)) {
      console.error(`[TokenCache] Warning: Got invalid expires string "${expiresAtStr}". Defaulting to 55min cache.`);
      expiresAt = Date.now() + 55 * 60 * 1000;
    }

    const cache = this.readCache();
    cache[installationId] = { token, expiresAt };
    this.writeCache(cache);
  }
}
