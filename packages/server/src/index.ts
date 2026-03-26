#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Load workspace plugins/tools
import { registerAuthTools } from "@gh-mcp/auth";

const server = new McpServer({
  name: "gh-mcp-global-server",
  version: "1.0.0",
});

// Register all tools onto the singular global server instance
registerAuthTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Global GitHub MCP Server is running! Mounted tools: get_installation_token");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
