#!/usr/bin/env node
import http from "node:http";

const HOST = process.env.MOCK_OPENCLAW_HOST || "127.0.0.1";
const PORT = Number(process.env.MOCK_OPENCLAW_PORT || 18789);
const PATHNAME = process.env.MOCK_OPENCLAW_PATH || "/hooks/github";

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString("utf-8");
  });

  req.on("end", () => {
    if (req.method === "POST" && req.url === PATHNAME) {
      console.log("--- MOCK OPENCLAW RECEIVED ---");
      console.log("method:", req.method);
      console.log("url:", req.url);
      console.log("authorization:", req.headers["authorization"] || "");
      console.log("x-github-event:", req.headers["x-github-event"] || "");
      console.log("x-github-delivery:", req.headers["x-github-delivery"] || "");
      console.log("body:", body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, accepted: true }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`mock-openclaw listening on http://${HOST}:${PORT}${PATHNAME}`);
});
