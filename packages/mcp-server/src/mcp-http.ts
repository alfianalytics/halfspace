import { serve } from "@hono/node-server";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { createLiga1McpServer } from "./server.js";

const port = Number(process.env.MCP_PORT || 3005);

const handler = createMcpHandler(() => createLiga1McpServer());

const app = new Hono();

app.all("/mcp", (c) => handler.fetch(c.req.raw));

const httpServer = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`liga1-intelligence-mcp HTTP server listening on http://localhost:${info.port}/mcp`);
});

process.on("SIGINT", async () => {
  await handler.close();
  httpServer.close();
  process.exit(0);
});
