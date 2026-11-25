import { serve } from "@hono/node-server";
import { agentToClientStream, parseClientStreamRequest } from "@anvia/client";
import { createClientStreamResponse } from "@anvia/server";
import {
  DEFAULT_MODEL_ID,
  getRecentTraces,
  MODEL_OPTIONS,
  runHalfspaceAgent,
  runHybridNewsSyncWorkflow,
} from "@halfspace/agents";
import {
  ensureHalfspaceSchema,
  fetchSeasonPlayerCohort,
  getFeaturedLiga1Fixtures,
  getLastNewsSyncDate,
  memoryStore,
} from "@halfspace/db";
import { createLiga1McpServer } from "@halfspace/mcp-server";
import { createMcpHandler } from "@modelcontextprotocol/server";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";

await ensureHalfspaceSchema();
void Promise.all([
  fetchSeasonPlayerCohort("26/27").catch(() => []),
  fetchSeasonPlayerCohort("25/26").catch(() => []),
]);

const app = new Hono();

// Expose x-anvia-stream-protocol header so @anvia/client in the browser can read the stream (Day 13 Slide 3)
app.use(
  "*",
  cors({
    origin: "*",
    exposeHeaders: ["x-anvia-stream-protocol"],
  }),
);

// Health & Metadata
app.get("/", (c) =>
  c.json({
    name: "halfspace-api",
    product: "Halfspace — Indonesia Super League Intelligence & Visual Report Assistant",
    status: "ok",
    lastNewsSyncDate: getLastNewsSyncDate() || "2026-11-25",
    mcpEndpoint: "/mcp",
  }),
);

// Available Models
app.get("/api/models", (c) =>
  c.json({
    default: DEFAULT_MODEL_ID,
    models: MODEL_OPTIONS,
  }),
);

// Live Liga 1 Fixtures Bar for Home Screen (`/`)
app.get("/api/fixtures", async (c) => {
  const fixtures = await getFeaturedLiga1Fixtures(6);
  return c.json({ fixtures });
});

// Hybrid News Sync Workflow Endpoint (Manual UI Trigger + Status)
app.get("/api/news/status", (c) =>
  c.json({
    lastSyncDate: getLastNewsSyncDate() || "2026-11-25",
  }),
);

app.post("/api/news/sync", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const res = await runHybridNewsSyncWorkflow({
    force: true,
    clubQuery: typeof body?.club === "string" ? body.club : undefined,
  });
  return c.json(res);
});

// In-App Trace Summary Endpoint (Observability fallback when Docker Lens is offline)
app.get("/api/traces", (c) => {
  const sessionId = c.req.query("sessionId");
  return c.json({ traces: getRecentTraces(sessionId) });
});

// Anvia Streaming Chat Endpoint (`POST /api/chat`)
app.post("/api/chat", async (c) => {
  const rawBody = await c.req.json();
  const body = parseClientStreamRequest(rawBody);
  if (body.type !== "messages") {
    return c.json({ error: "This endpoint accepts messages only." }, 400);
  }

  const sessionId =
    (typeof rawBody?.metadata?.sessionId === "string" ? rawBody.metadata.sessionId : undefined) ||
    c.req.query("sessionId") ||
    "default-session";

  const modelId =
    (typeof rawBody?.metadata?.modelId === "string" ? rawBody.metadata.modelId : undefined) ||
    c.req.query("model") ||
    DEFAULT_MODEL_ID;

  const events = agentToClientStream({
    events: runHalfspaceAgent({
      messages: body.messages,
      memory: {
        store: memoryStore,
        session: { sessionId, userId: "default-user" },
      },
      modelId,
    }),
  });

  return createClientStreamResponse({ events });
});

// Session History Endpoints (`GET /api/session`, `GET /api/session/:id`, `DELETE /api/session/:id`)
app.get("/api/session", async (c) => {
  const sessions = await memoryStore.listSessions(50);
  return c.json({ sessions });
});

app.get("/api/session/:id", async (c) => {
  const id = c.req.param("id");
  const conversation = await memoryStore.getSessionConversation(id);
  if (!conversation) {
    return c.json({ conversation: { messages: [] } });
  }
  return c.json({ conversation });
});

app.delete("/api/session/:id", async (c) => {
  const id = c.req.param("id");
  await memoryStore.clear({ scope: { sessionId: id } });
  return c.json({ ok: true });
});

// Mount MCP Producer Server at `/mcp` (`liga1-intelligence-mcp`)
const mcpHandler = createMcpHandler(() => createLiga1McpServer());
app.all("/mcp", (c) => mcpHandler.fetch(c.req.raw));

const port = Number(process.env.PORT ?? 8000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`========================================================`);
  console.log(`🚀 Halfspace API & MCP Server listening on http://localhost:${info.port}`);
  console.log(`   Chat Stream: POST http://localhost:${info.port}/api/chat`);
  console.log(`   MCP Server:  POST http://localhost:${info.port}/mcp`);
  console.log(`========================================================`);
});

export type AppType = typeof app;
