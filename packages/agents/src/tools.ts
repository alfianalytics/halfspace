import { createTool } from "@anvia/core";
import {
  getPlayerReportData,
  getPrematchContext,
  queryReadOnly,
  scoutLiga1Players,
  searchRagDocuments,
} from "@halfspace/db";
import { tavily } from "@tavily/core";
import { z } from "zod";
import "dotenv/config";
import { validateVisualCardPayload } from "./workflow-news-sync.js";

/**
 * 1. RAG Search Tool: News, Liga 1 Regulations, and Tactical Methodology
 */
export const searchLiga1KnowledgeRagTool = createTool({
  name: "search_liga1_knowledge_rag",
  description:
    "Search the Halfspace Hybrid RAG knowledge base for Indonesia Super League (Liga 1) matchweek news (player injuries, 50/50 doubtful fitness updates, yellow/red card suspensions, Timnas call-ups, coach press conferences), official PSSI/LIB competition regulations (U-23 mandatory starter rule, 6-on-pitch foreign player quota), and methodology rules (PAdj defense, progressive pass proxies). Always cite the returned `docId` in brackets like `[docId]`.",
  inputSchema: z.object({
    query: z.string().describe("Search query, e.g. 'Persib Bandung cedera doubtful', 'regulasi U-23 starter', 'progressive pass proxy'"),
    category: z
      .enum(["all", "news", "regulation", "methodology", "tactical_profile"])
      .optional()
      .describe("Filter by document category"),
    club: z.string().optional().describe("Optional club name filter"),
  }),
  execute: async ({ query, category, club }) => {
    const docs = await searchRagDocuments({ query, category: category ?? "all", club, limit: 5 });
    return {
      retrievedCount: docs.length,
      documents: docs.map((d) => ({
        docId: d.docId,
        citationTag: `[${d.docId}]`,
        title: d.title,
        category: d.category,
        club: d.club,
        publishedDate: d.publishedDate,
        sourceUrl: d.sourceUrl,
        content: d.content,
      })),
    };
  },
});

/**
 * 2. Player Scouting & Peer Comparison Tool (PostgreSQL + PeerComparisonCard Visual Payload)
 */
export const scoutPlayersTool = createTool({
  name: "scout_players",
  description:
    "Scout and rank Indonesia Super League (Liga 1) players from PostgreSQL by position (CM, DM, AM, CB, FB, W, ST, GK), season (24/25, 25/26, 26/27), ageGroup (U23, Senior, All), nationality (Local, Foreign, All), club, and styleFocus (progression, defense_padj, attacking_xg, creative_keypass, balanced). Also returns a validated `comparisonCard` visual payload for rendering the Peer Comparison Chart in the chat.",
  inputSchema: z.object({
    position: z.string().optional().describe("Target position: CM, DM, AM, CB, FB, W, ST, GK"),
    season: z.string().optional().describe("Season: 26/27 (default), 25/26, or 24/25"),
    ageGroup: z.enum(["U23", "Senior", "All"]).optional().describe("U23 (<=23), Senior (>23), or All"),
    nationality: z.enum(["Local", "Foreign", "All"]).optional().describe("Local (IDN) or Foreign"),
    club: z.string().optional().describe("Optional club filter"),
    minMinutes: z.number().optional().describe("Minimum minutes threshold (default 450, or 180 in ongoing 26/27)"),
    styleFocus: z
      .enum(["progression", "defense_padj", "attacking_xg", "creative_keypass", "balanced"])
      .optional(),
    limit: z.number().optional().describe("Number of players to return (default 8, or 2 for head-to-head)"),
  }),
  execute: async (args) => {
    const result = await scoutLiga1Players(args);
    const validatedCard = validateVisualCardPayload("peer_comparison", result.comparisonCard);
    return {
      ...result,
      visualCard: validatedCard,
    };
  },
});

/**
 * 3. Pre-Match Analysis & Starting XI Prediction Tool (PostgreSQL + RAG News/Rules + PrematchLineupCard Visual Payload)
 */
export const getPrematchContextTool = createTool({
  name: "get_prematch_context",
  description:
    "Run a complete Pre-Match Tactical Analysis & Starting XI Prediction for two Liga 1 clubs. Combines PostgreSQL recent form, formations, xG splits, and card counts with Hybrid RAG injury/suspension news (Confirmed Out vs 50/50 Doubtful with named backups) and PSSI/LIB U-23 & Foreign player quota verification. Returns a validated `visualCard` (`prematch_lineup`) that renders the Pitch Formation Board in the chat.",
  inputSchema: z.object({
    homeTeam: z.string().describe("Home club name, e.g. Persib Bandung"),
    awayTeam: z.string().describe("Away club name, e.g. Persija Jakarta"),
    season: z.string().optional().describe("Season: 26/27 (default) or 25/26"),
  }),
  execute: async (args) => {
    const result = await getPrematchContext(args);
    const validatedCard = validateVisualCardPayload("prematch_lineup", result.prematchCard);
    return {
      visualCard: validatedCard,
      relevantNewsAndRules: result.relevantNewsAndRules,
    };
  },
});

/**
 * 4. Player Scouting & Two-Season Evolution Visual Report Tool (PostgreSQL + PlayerScoutingCard Visual Payload)
 */
export const getPlayerReportDataTool = createTool({
  name: "get_player_report_data",
  description:
    "Generate a detailed single-season or two-season evolution (e.g. 25/26 vs 26/27) scouting report and percentile visual card for a specific Liga 1 player. Automatically applies the >=180 mins Early Season Sample rule for ongoing season 26/27 and returns a validated `visualCard` (`player_scouting`) rendered inline in the chat.",
  inputSchema: z.object({
    playerName: z.string().describe("Player name, e.g. Marc Klok, Rizky Ridho, Beckham Putra, Francisco Rivera, Kadek Arel"),
    seasonA: z.string().optional().describe("Current/target season, default 26/27"),
    seasonB: z.string().optional().describe("Comparison season for 2-season evolution, default 25/26"),
  }),
  execute: async (args) => {
    const result = await getPlayerReportData(args);
    if (!result.found || !result.card) {
      return result;
    }
    const validatedCard = validateVisualCardPayload("player_scouting", result.card);
    return {
      found: true,
      visualCard: validatedCard,
    };
  },
});

/**
 * 5. Guarded Read-Only SQL Tool for Ad-Hoc Follow-up Questions
 */
export const queryLiga1ReadonlySqlTool = createTool({
  name: "query_liga1_readonly_sql",
  description:
    "Guarded read-only SELECT query tool against the PostgreSQL `sofascore` schema for unique ad-hoc follow-up questions (e.g. top scorers, specific match scores, goalkeeper saves). Restricted to SELECT-only with 3000ms timeout and LIMIT 50. Tables: sofascore.dim_player, sofascore.dim_team, sofascore.fact_match, sofascore.fact_player_x_match_stats, sofascore.fact_team_x_match_stats, sofascore.fact_shots, sofascore.fact_incidents. Liga 1 tournament_id = 1015; season_id: 65049 (24/25), 78590 (25/26), 100394 (26/27).",
  inputSchema: z.object({
    sqlQuery: z.string().describe("Read-only SELECT query against sofascore.*"),
  }),
  execute: async ({ sqlQuery }) => {
    const cleaned = sqlQuery.trim().replace(/;+$/, "");
    const withLimit = /\bLIMIT\s+\d+/i.test(cleaned) ? cleaned : `${cleaned} LIMIT 50`;
    const rows = await queryReadOnly(withLimit, [], 3000);
    return {
      rowCount: rows.length,
      rows,
    };
  },
});

/**
 * 6. Live Web Search Fallback Tool (External Web Context / Tavily)
 */
export const searchLiveWebNewsTool = createTool({
  name: "search_live_football_web",
  description:
    "Search live Indonesian football news on the web (via Tavily) when breaking matchday news, last-minute transfers, or press conferences are not yet in the RAG database.",
  inputSchema: z.object({
    query: z.string().describe("Web search query, e.g. 'kondisi cedera pemain Persib terbaru hari ini'"),
  }),
  execute: async ({ query }) => {
    if (!process.env.TAVILY_API_KEY) {
      return { results: [], note: "TAVILY_API_KEY not configured; rely on search_liga1_knowledge_rag." };
    }
    try {
      const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
      const res = await tvly.search(query, { maxResults: 4 });
      return {
        results: (res.results ?? []).map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        })),
      };
    } catch (err: any) {
      return { results: [], error: err?.message || String(err) };
    }
  },
});

export const HALFSPACE_TOOLS = [
  scoutPlayersTool,
  getPrematchContextTool,
  getPlayerReportDataTool,
  searchLiga1KnowledgeRagTool,
  queryLiga1ReadonlySqlTool,
  searchLiveWebNewsTool,
] as const;
