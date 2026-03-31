#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";

// Load workspace plugins/tools
import { registerAuthTools } from "@gh-mcp/auth";
import { registerWebhookProxyFromEnv } from "@gh-mcp/webhook-proxy";

const server = new McpServer({
  name: "gh-mcp-global-server",
  version: "1.0.0",
});

// Register all tools onto the singular global server instance
registerAuthTools(server);

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
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    // Connect server to transport immediately for HTTP mode
    await server.connect(transport);

    app.get("/healthz", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const webhookProxy = registerWebhookProxyFromEnv(app);
    if (webhookProxy.enabled) {
      console.error(`🔁 GitHub Webhook Proxy enabled at ${webhookProxy.path}`);
    } else {
      console.error("ℹ️ GitHub Webhook Proxy disabled (missing env vars)");
    }

    // StreamableHTTPServerTransport handles both GET (SSE) and POST in one endpoint
    app.all("/gh-mcp", async (req, res) => {
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
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 GitHub MCP Local Server is running (Stdio)");
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
