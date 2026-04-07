import type { Express, Request, Response } from "express";
import express from "express";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";

export type WebhookProxyOptions = {
  path?: string;
  githubWebhookSecret: string;
  openclawWebhookUrl: string;
  openclawHooksToken: string;
  bodyLimit?: string;
  dedupeTtlMs?: number;
};

type CachedDelivery = {
  seenAt: number;
};

const DEFAULT_PATH = "/gh-webhook";
const DEFAULT_BODY_LIMIT = "1mb";
const DEFAULT_DEDUPE_TTL_MS = 10 * 60 * 1000;

function verifyGithubSignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const provided = signatureHeader.trim();

  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

function cleanupExpired(cache: Map<string, CachedDelivery>, now: number, ttlMs: number): void {
  for (const [key, value] of cache.entries()) {
    if (now - value.seenAt > ttlMs) {
      cache.delete(key);
    }
  }
}

function getDeliveryKey(req: Request, rawBody: Buffer): string {
  const deliveryId = req.header("x-github-delivery");
  if (deliveryId && deliveryId.trim().length > 0) {
    return deliveryId.trim();
  }
  return `body:${createHash("sha256").update(rawBody).digest("hex")}`;
}

function getRawBody(req: Request): Buffer {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Buffer.from(req.body, "utf-8");
  }

  if (req.body && typeof req.body === "object") {
    return Buffer.from(JSON.stringify(req.body), "utf-8");
  }

  return Buffer.alloc(0);
}

export function registerWebhookProxyRoutes(app: Express, options: WebhookProxyOptions): void {
  const path = options.path ?? DEFAULT_PATH;
  const bodyLimit = options.bodyLimit ?? DEFAULT_BODY_LIMIT;
  const dedupeTtlMs = options.dedupeTtlMs ?? DEFAULT_DEDUPE_TTL_MS;
  const seenDeliveries = new Map<string, CachedDelivery>();

  app.post(path, express.raw({ type: "*/*", limit: bodyLimit }), async (req: Request, res: Response) => {
    const rawBody = getRawBody(req);
    const signatureHeader = req.header("x-hub-signature-256");
    const event = req.header("x-github-event") || "unknown";
    const delivery = req.header("x-github-delivery") || "unknown";

    console.error(`[webhook-proxy] Received ${event} event (delivery: ${delivery})`);

    if (!verifyGithubSignature(rawBody, signatureHeader, options.githubWebhookSecret)) {
      console.error(`[webhook-proxy] Rejecting delivery ${delivery}: Invalid signature`);
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const now = Date.now();
    cleanupExpired(seenDeliveries, now, dedupeTtlMs);

    const deliveryKey = getDeliveryKey(req, rawBody);
    if (seenDeliveries.has(deliveryKey)) {
      console.error(`[webhook-proxy] Delivery ${delivery} deduplicated (already seen)`);
      res.status(202).json({ ok: true, deduplicated: true });
      return;
    }

    const contentType = req.header("content-type") || "application/json";

    try {
      console.error(`[webhook-proxy] Forwarding delivery ${delivery} to OpenClaw...`);
      const upstreamUrl = `${options.openclawWebhookUrl.replace(/\/$/, "")}/github`;
      const upstreamResponse = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${options.openclawHooksToken}`,
          "content-type": contentType,
          "x-github-delivery": req.header("x-github-delivery") || "",
          "x-github-event": req.header("x-github-event") || "",
        },
        body: rawBody.toString("utf-8"),
      });

      const responseText = await upstreamResponse.text();
      if (!upstreamResponse.ok) {
        console.error(`[webhook-proxy] Failed to forward delivery ${delivery}: HTTP ${upstreamResponse.status}`);
        console.error(`[webhook-proxy] Upstream response: ${responseText.slice(0, 500)}`);
        res.status(502).json({
          error: "OpenClaw webhook forwarding failed",
          upstreamStatus: upstreamResponse.status,
          upstreamBody: responseText.slice(0, 1024),
        });
        return;
      }

      console.error(`[webhook-proxy] Successfully forwarded delivery ${delivery} (HTTP ${upstreamResponse.status})`);
      seenDeliveries.set(deliveryKey, { seenAt: now });

      res.status(202).json({
        ok: true,
        forwarded: true,
        openclawStatus: upstreamResponse.status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[webhook-proxy] Error forwarding delivery ${delivery}: ${message}`);
      res.status(502).json({
        error: "OpenClaw webhook forwarding error",
        details: message,
      });
    }
  });
}

export function registerWebhookProxyFromEnv(app: Express): { enabled: boolean; path: string } {
  const githubWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  const openclawWebhookUrl = process.env.OPENCLAW_WEBHOOK_URL;
  const openclawHooksToken = process.env.OPENCLAW_HOOKS_TOKEN;
  const path = process.env.WEBHOOK_PROXY_PATH || DEFAULT_PATH;

  if (!githubWebhookSecret || !openclawWebhookUrl || !openclawHooksToken) {
    return { enabled: false, path };
  }

  registerWebhookProxyRoutes(app, {
    path,
    githubWebhookSecret,
    openclawWebhookUrl,
    openclawHooksToken,
    bodyLimit: process.env.WEBHOOK_PROXY_BODY_LIMIT || DEFAULT_BODY_LIMIT,
  });

  return { enabled: true, path };
}
