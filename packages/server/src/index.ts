#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { randomUUID, timingSafeEqual } from "node:crypto";
import { parseArgs } from "node:util";

// Load workspace plugins/tools
import { registerAuthTools } from "@gh-mcp/auth";
import { registerWebhookProxyFromEnv } from "@gh-mcp/webhook-proxy";

function parseBearerToken(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const normalized = value.trim();
  if (!normalized.startsWith("Bearer ")) {
    return "";
  }
  return normalized.slice("Bearer ".length).trim();
}

function secureTokenEquals(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }
  return timingSafeEqual(providedBytes, expectedBytes);
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      sse: { type: "boolean" },
      transport: { type: "string" },
      host: { type: "string", default: "127.0.0.1" },
      port: { type: "string", short: "p", default: "3000" },
    },
    strict: false,
  });

  const isSSE = values.sse || values.transport === "sse";
  const host = typeof values.host === "string" ? values.host : "127.0.0.1";
  const port = values.port || "3000";

  if (isSSE) {
    // --- Remote/HTTP Mode (Streamable HTTP) ---
    const app = express();

    app.get("/healthz", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const webhookProxy = registerWebhookProxyFromEnv(app);
    if (webhookProxy.enabled) {
      console.error(`🔁 GitHub Webhook Proxy enabled at ${webhookProxy.path}`);
    } else {
      console.error("ℹ️ GitHub Webhook Proxy disabled (missing env vars)");
    }

    const mcpApiKey = (process.env.MCP_API_KEY || "").trim();
    if (!mcpApiKey) {
      console.error("⚠️ MCP_API_KEY is not configured. /gh-mcp will reject all requests.");
    }

    // Each session gets its own transport+server pair; keyed by mcp-session-id
    const sessions = new Map<string, StreamableHTTPServerTransport>();

    function createSession(): StreamableHTTPServerTransport {
      const sessionTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          sessions.set(sessionId, sessionTransport);
        },
        onsessionclosed: (sessionId) => {
          sessions.delete(sessionId);
        },
      });

      const sessionServer = new McpServer({
        name: "gh-mcp-global-server",
        version: "1.0.0",
      });
      registerAuthTools(sessionServer);
      sessionServer.connect(sessionTransport);

      return sessionTransport;
    }

    // StreamableHTTPServerTransport handles both GET (SSE) and POST in one endpoint
    app.all("/gh-mcp", async (req, res) => {
      if (!mcpApiKey) {
        res.status(503).json({ error: "MCP API key is not configured on server" });
        return;
      }

      const providedToken = parseBearerToken(req.header("authorization"));
      if (!providedToken || !secureTokenEquals(providedToken, mcpApiKey)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId) {
        const existing = sessions.get(sessionId);
        if (!existing) {
          res.status(404).json({ error: "Session not found" });
          return;
        }
        transport = existing;
      } else {
        // New client: allocate a fresh transport+server pair
        transport = createSession();
      }

      try {
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error("Transport request handling failed:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal Server Error" });
        }
      }
    });

    const parsedPort = Number.parseInt(port as string, 10);
    if (Number.isNaN(parsedPort)) {
      throw new Error(`Invalid port: ${port}`);
    }

    try {
      const httpServer = app.listen(parsedPort, host, () => {
        console.error(`🚀 GitHub MCP Remote Server is running on port ${parsedPort} (HTTP)`);
        console.error(`   Endpoint URL: http://${host}:${parsedPort}/gh-mcp`);
        console.error(`   Health URL: http://${host}:${parsedPort}/healthz`);
      });

      httpServer.on("error", (error) => {
        console.error("HTTP server failed to start:", error);
        process.exit(1);
      });
    } catch (error) {
      console.error("HTTP server failed to start:", error);
      process.exit(1);
    }
  } else {
    // --- Local/Stdio Mode (Default) ---
    const stdioServer = new McpServer({
      name: "gh-mcp-global-server",
      version: "1.0.0",
    });
    registerAuthTools(stdioServer);
    const transport = new StdioServerTransport();
    await stdioServer.connect(transport);
    console.error("🚀 GitHub MCP Local Server is running (Stdio)");
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
