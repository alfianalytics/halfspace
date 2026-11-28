import { createTool } from "@anvia/core";
import {
  getPlayerReportData,
  getPrematchContext,
  getTeamStyleProfile,
  getUpcomingFixtures,
  loadUserMemoryFacts,
  queryReadOnly,
  saveUserMemoryFact,
  scoutLiga1Players,
  searchRagDocuments,
} from "@halfspace/db";
import { tavily } from "@tavily/core";
import { z } from "zod";
import "dotenv/config";
import { validateVisualCardPayload } from "./workflow-news-sync.js";

/**
 * Ensures every tool result is a strict JSON value (no `undefined`, `Date`, `BigInt`, or non-plain objects),
 * which `@anvia/core` strictly requires for tool outputs.
 */
function toStrictJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  ) as T;
}

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
    return toStrictJson({
      retrievedCount: docs.length,
      documents: docs.map((d) => ({
        docId: d.docId,
        citationTag: `[${d.docId}]`,
        title: d.title,
        category: d.category,
        club: d.club ?? null,
        publishedDate: d.publishedDate,
        sourceUrl: d.sourceUrl,
        content: d.content,
      })),
    });
  },
});

/**
 * 2. Player Scouting & Peer Comparison Tool (PostgreSQL + PeerComparisonCard Visual Payload)
 */
export const scoutPlayersTool = createTool({
  name: "scout_players",
  description:
    "Scout and rank players from PostgreSQL across Indonesia Super League (Liga 1) OR Top European Leagues (Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, UEFA Champions League, Championship) by position (CM, DM, AM, CB, FB, W, ST, GK), season (24/25, 25/26, 26/27), ageGroup (U23, Senior, All), nationality (Local, Foreign, All), club, and styleFocus. Also returns a validated `comparisonCard` visual payload for rendering the Peer Comparison Chart.",
  inputSchema: z.object({
    league: z
      .string()
      .optional()
      .describe("League name: 'Liga 1' (default), 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'UCL'"),
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
    return toStrictJson({
      ...result,
      visualCard: validatedCard,
    });
  },
});

/**
 * 3. Pre-Match Analysis & Starting XI Prediction Tool (PostgreSQL + fact_upcoming_match + RAG News/Rules)
 */
export const getPrematchContextTool = createTool({
  name: "get_prematch_context",
  description:
    "Run a complete Pre-Match Tactical Analysis & Starting XI Prediction. Combines PostgreSQL recent form, formations, xG splits, and card counts with Hybrid RAG injury/suspension news (Confirmed Out vs 50/50 Doubtful with named backups) and U-23 & Foreign player quota verification. If `awayTeam` is omitted (e.g. user asks 'Analisis next match Persib'), it automatically looks up the next scheduled opponent & WIB kickoff time in `sofascore.fact_upcoming_match`! Returns a validated `visualCard` (`prematch_lineup`).",
  inputSchema: z.object({
    homeTeam: z.string().describe("Club name (or home club), e.g. Persib Bandung, Persija Jakarta, Arsenal"),
    awayTeam: z
      .string()
      .optional()
      .describe("Optional away club name. Omit to automatically resolve `homeTeam`'s next opponent from `sofascore.fact_upcoming_match`."),
    league: z
      .string()
      .optional()
      .describe("Optional league: 'Liga 1', 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'UCL'"),
    season: z.string().optional().describe("Season: 26/27 (default) or 25/26"),
  }),
  execute: async (args) => {
    const result = await getPrematchContext(args);
    const validatedCard = validateVisualCardPayload("prematch_lineup", result.prematchCard);
    return toStrictJson({
      upcomingFixture: result.upcomingFixture ?? null,
      visualCard: validatedCard,
      relevantNewsAndRules: result.relevantNewsAndRules,
    });
  },
});

/**
 * 3b. Upcoming Matchweek Fixtures Tool (`sofascore.fact_upcoming_match`)
 */
export const getUpcomingFixturesTool = createTool({
  name: "get_upcoming_fixtures",
  description:
    "Fetch upcoming scheduled football matches (round, home/away clubs, and exact WIB kickoff time) from `sofascore.fact_upcoming_match` across Liga 1, Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, and UEFA Champions League, or for a specific club (e.g. 'Persib lawan siapa next match?', 'Jadwal Liga 1 minggu ini').",
  inputSchema: z.object({
    league: z
      .string()
      .optional()
      .describe("League name: 'Liga 1', 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'UCL'"),
    teamName: z.string().optional().describe("Optional club name filter, e.g. 'Persib Bandung', 'Persija', 'Arsenal'"),
    limit: z.number().optional().describe("Number of upcoming fixtures to return (default 8)"),
  }),
  execute: async (args) => {
    const fixtures = await getUpcomingFixtures({
      league: args.league ?? (args.teamName ? undefined : "Liga 1"),
      teamName: args.teamName,
      limit: args.limit ?? 8,
    });
    return toStrictJson({
      count: fixtures.length,
      fixtures,
    });
  },
});

/**
 * 4. Player Scouting & Two-Season Evolution Visual Report Tool (PostgreSQL + PlayerScoutingCard Visual Payload)
 */
export const getPlayerReportDataTool = createTool({
  name: "get_player_report_data",
  description:
    "Generate a detailed single-season or two-season evolution (e.g. 25/26 vs 26/27) scouting report and percentile visual card for a specific player across Liga 1 or Top European Leagues (Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, UCL). Automatically applies the >=180 mins Early Season Sample rule for ongoing season 26/27 and returns a validated `visualCard` (`player_scouting`).",
  inputSchema: z.object({
    playerName: z.string().describe("Player name, e.g. Mariano Peralta, Marc Klok, Rizky Ridho, Bukayo Saka, Lamine Yamal"),
    league: z
      .string()
      .optional()
      .describe("League name: 'Liga 1' (default), 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'UCL'"),
    seasonA: z.string().optional().describe("Current/target season, default 26/27"),
    seasonB: z.string().optional().describe("Comparison season for 2-season evolution, default 25/26"),
  }),
  execute: async (args) => {
    const result = await getPlayerReportData(args);
    if (!result.found || !result.card) {
      return toStrictJson(result);
    }
    const validatedCard = validateVisualCardPayload("player_scouting", result.card);
    return toStrictJson({
      found: true,
      visualCard: validatedCard,
    });
  },
});

/**
 * 5. Guarded Read-Only SQL Tool for Ad-Hoc Follow-up Questions
 */
export const queryLiga1ReadonlySqlTool = createTool({
  name: "query_liga1_readonly_sql",
  description:
    "Guarded read-only SELECT query tool against the PostgreSQL `sofascore` schema for unique ad-hoc follow-up questions (e.g. upcoming schedules in `sofascore.fact_upcoming_match`, top scorers, specific match scores, goalkeeper saves). Restricted to SELECT-only with 8000ms timeout and LIMIT 50. Tables: sofascore.fact_upcoming_match (tournament_id, season_id, match_id, match_datetime [UTC], home_team_name, away_team_name, round, status_type), sofascore.dim_player, sofascore.dim_team, sofascore.fact_match, sofascore.fact_player_x_match_stats, sofascore.fact_team_x_match_stats, sofascore.fact_shots, sofascore.fact_incidents. Tournament IDs: 1015 (Liga 1), 17 (Premier League), 8 (LaLiga), 23 (Serie A), 35 (Bundesliga), 34 (Ligue 1), 7 (UCL).",
  inputSchema: z.object({
    sqlQuery: z.string().describe("Read-only SELECT query against sofascore.*"),
  }),
  execute: async ({ sqlQuery }) => {
    const cleaned = sqlQuery.trim().replace(/;+$/, "");
    const withLimit = /\bLIMIT\s+\d+/i.test(cleaned) ? cleaned : `${cleaned} LIMIT 50`;
    const rows = await queryReadOnly(withLimit, [], 8000);
    return toStrictJson({
      rowCount: rows.length,
      rows,
    });
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

/**
 * 7. Explicit Cross-Session User Memory Tool (`remember_user_fact`)
 */
export const rememberUserFactTool = createTool({
  name: "remember_user_fact",
  description:
    "Save a specific fact, preference, favorite club, target player watchlist, or user instruction into persistent cross-session memory (`halfspace.user_facts`) whenever the user explicitly asks you to remember/save something or shares personal context.",
  inputSchema: z.object({
    key: z.string().describe("Short identifier key, e.g. 'favorite_club', 'watchlist_midfielder', 'user_role'"),
    fact: z.string().describe("The fact or preference to remember across all sessions"),
  }),
  execute: async ({ key, fact }) => {
    const saved = await saveUserMemoryFact(key, fact);
    const allFacts = await loadUserMemoryFacts();
    return toStrictJson({
      saved,
      totalRememberedFacts: allFacts.length,
      allFacts,
    });
  },
});

/**
 * 4b. Team Tactical Style, Strengths/Weaknesses & Key Players Tool (`balbalanalytics` 24-Metric Matrix)
 */
export const getTeamStyleProfileTool = createTool({
  name: "get_team_style_profile",
  description:
    "Analyze a club's complete Playing Style (12 In-Possession & Out-of-Possession style metrics), Performance Strengths & Weaknesses (12 Attack & Defence efficiency metrics across Overall, Home, Away, and Last 6 Matches), Dominant Formations, and Key Players (Top Threats by npxG+Shots & Top Creators by Key Passes+xA). Works across Liga 1 and Top European Leagues. Returns a validated `visualCard` (`team_style_profile`).",
  inputSchema: z.object({
    teamName: z.string().describe("Club name, e.g. Persib Bandung, Borneo FC, Persija Jakarta, Persebaya, Arsenal, Barcelona"),
    league: z
      .string()
      .optional()
      .describe("League name: 'Liga 1' (default), 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'UCL'"),
    season: z.string().optional().describe("Season: 26/27 (default), 25/26, or 24/25"),
  }),
  execute: async (args) => {
    const result = await getTeamStyleProfile(args);
    if (!result.found || !result.card) {
      return toStrictJson(result);
    }
    const validatedCard = validateVisualCardPayload("team_style_profile", result.card);
    return toStrictJson({
      found: true,
      visualCard: validatedCard,
    });
  },
});

export const HALFSPACE_TOOLS = [
  scoutPlayersTool,
  getPrematchContextTool,
  getUpcomingFixturesTool,
  getPlayerReportDataTool,
  getTeamStyleProfileTool,
  searchLiga1KnowledgeRagTool,
  queryLiga1ReadonlySqlTool,
  searchLiveWebNewsTool,
  rememberUserFactTool,
] as const;
