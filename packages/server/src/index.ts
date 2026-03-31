#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { parseArgs } from "node:util";

// Load workspace plugins/tools
import { registerAuthTools } from "@gh-mcp/auth";

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
      port: { type: "string", short: "p", default: "3000" },
    },
    strict: false,
  });

  const isSSE = values.sse || values.transport === "sse";
  const port = values.port || "3000";

  if (isSSE) {
    // --- Remote/HTTP Mode (Streamable HTTP) ---
    const app = express();
    const transport = new StreamableHTTPServerTransport();

    // Connect server to transport immediately for HTTP mode
    await server.connect(transport);

    // StreamableHTTPServerTransport handles both GET (SSE) and POST in one endpoint
    app.all("/gh-mcp", (req, res) => {
      transport.handleRequest(req, res);
    });

    const parsedPort = parseInt(port as string);
    app.listen(parsedPort, "0.0.0.0", () => {
      console.error(`🚀 GitHub MCP Remote Server is running on port ${parsedPort} (HTTP)`);
      console.error(`   Endpoint URL: http://0.0.0.0:${parsedPort}/gh-mcp`);
    });
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
