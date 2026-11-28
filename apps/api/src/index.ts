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
  buildStudioPlayerCard,
  buildStudioPlayerRanking,
  buildStudioPlayerScatter,
  buildStudioTeamScatter,
  ensureHalfspaceSchema,
  fetchLeagueTeamStyles,
  fetchSeasonPlayerCohort,
  getFeaturedLiga1Fixtures,
  getLastNewsSyncDate,
  getStudioOptions,
  getTeamStyleProfile,
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
  fetchLeagueTeamStyles(1015, "26/27").catch(() => []),
  fetchLeagueTeamStyles(1015, "25/26").catch(() => []),
]);

const app = new Hono();

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
    product: "Halfspace — Football Intelligence & Visual Studio",
    status: "ok",
    lastNewsSyncDate: getLastNewsSyncDate() || "2026-11-28",
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

// ============================================================================
// INTERACTIVE VISUAL STUDIO ENDPOINTS (`/api/studio/*`)
// ============================================================================

app.get("/api/studio/options", async (c) => {
  const league = c.req.query("league") || "Liga 1";
  const season = c.req.query("season") || "26/27";
  const data = await getStudioOptions(league, season);
  return c.json(data);
});

app.get("/api/studio/player-card", async (c) => {
  const playerId = c.req.query("playerId") ? Number(c.req.query("playerId")) : undefined;
  const playerName = c.req.query("playerName");
  const league = c.req.query("league") || "Liga 1";
  const season = c.req.query("season") || "26/27";
  const compareSeason = c.req.query("compareSeason") || "25/26";
  const positionGroup = c.req.query("positionGroup") || "AUTO";
  const minMinutes = c.req.query("minMinutes") ? Number(c.req.query("minMinutes")) : undefined;
  const metricsParam = c.req.query("metrics");
  const metricKeys = metricsParam ? metricsParam.split(",").filter(Boolean) : undefined;

  const card = await buildStudioPlayerCard({
    playerId,
    playerName,
    league,
    season,
    compareSeason,
    positionGroup,
    minMinutes,
    metricKeys,
  });
  if (!card) return c.json({ error: "Player not found for selected filters" }, 404);
  return c.json({ card });
});

app.get("/api/studio/player-scatter", async (c) => {
  const league = c.req.query("league") || "Liga 1";
  const season = c.req.query("season") || "26/27";
  const xMetric = c.req.query("xMetric") || "accurateLongBallsPer90";
  const yMetric = c.req.query("yMetric") || "padjInterceptions";
  const positionGroup = c.req.query("positionGroup") || "CM";
  const ageGroup = (c.req.query("ageGroup") as "All" | "U23" | "Senior") || "All";
  const nationality = (c.req.query("nationality") as "All" | "Local" | "Foreign") || "All";
  const minMinutes = c.req.query("minMinutes") ? Number(c.req.query("minMinutes")) : undefined;
  const focalPlayerId = c.req.query("focalPlayerId") ? Number(c.req.query("focalPlayerId")) : undefined;
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 24;

  const card = await buildStudioPlayerScatter({
    league,
    season,
    xMetric,
    yMetric,
    positionGroup,
    ageGroup,
    nationality,
    minMinutes,
    focalPlayerId,
    limit,
  });
  return c.json({ card });
});

app.get("/api/studio/player-ranking", async (c) => {
  const league = c.req.query("league") || "Liga 1";
  const season = c.req.query("season") || "26/27";
  const metricKey = c.req.query("metricKey") || "nonPenXgPer90";
  const positionGroup = c.req.query("positionGroup") || "ALL";
  const ageGroup = (c.req.query("ageGroup") as "All" | "U23" | "Senior") || "All";
  const nationality = (c.req.query("nationality") as "All" | "Local" | "Foreign") || "All";
  const minMinutes = c.req.query("minMinutes") ? Number(c.req.query("minMinutes")) : undefined;
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 15;
  const ascending = c.req.query("ascending") === "true";

  const card = await buildStudioPlayerRanking({
    league,
    season,
    metricKey,
    positionGroup,
    ageGroup,
    nationality,
    minMinutes,
    limit,
    ascending,
  });
  return c.json({ card });
});

app.get("/api/studio/team-style", async (c) => {
  const teamName = c.req.query("teamName") || "Persib Bandung";
  const league = c.req.query("league") || "Liga 1";
  const season = c.req.query("season") || "26/27";
  const res = await getTeamStyleProfile({ teamName, league, season });
  if (!res.found || !res.card) {
    return c.json({ error: res.message || "Team not found" }, 404);
  }
  return c.json({ card: res.card });
});

app.get("/api/studio/team-scatter", async (c) => {
  const league = c.req.query("league") || "Liga 1";
  const season = c.req.query("season") || "26/27";
  const xMetricId = c.req.query("xMetricId") || "possession";
  const yMetricId = c.req.query("yMetricId") || "open_play_attack";
  const situation = (c.req.query("situation") as "All" | "Home" | "Away" | "Last 6") || "All";
  const focalTeamId = c.req.query("focalTeamId") ? Number(c.req.query("focalTeamId")) : undefined;

  const card = await buildStudioTeamScatter({
    league,
    season,
    xMetricId,
    yMetricId,
    situation,
    focalTeamId,
  });
  return c.json({ card });
});

// Hybrid News Sync Workflow Endpoint
app.get("/api/news/status", (c) =>
  c.json({
    lastSyncDate: getLastNewsSyncDate() || "2026-11-28",
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

// In-App Trace Summary Endpoint
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

// Session History Endpoints
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
  console.log(`🚀 Halfspace API, Studio & MCP Server listening on http://localhost:${info.port}`);
  console.log(`   Chat Stream: POST http://localhost:${info.port}/api/chat`);
  console.log(`   Studio API:  GET  http://localhost:${info.port}/api/studio/options`);
  console.log(`   MCP Server:  POST http://localhost:${info.port}/mcp`);
  console.log(`========================================================`);
});

export type AppType = typeof app;
