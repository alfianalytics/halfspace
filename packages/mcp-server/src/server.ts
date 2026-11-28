import {
  getPlayerReportData,
  getPrematchContext,
  getTeamStyleProfile,
  getUpcomingFixtures,
  queryReadOnly,
  scoutLiga1Players,
} from "@halfspace/db";
import { McpServer } from "@modelcontextprotocol/server";
import "dotenv/config";
import { z } from "zod";

/**
 * MCP Producer: `liga1-intelligence-mcp`
 * Exposes 3 goal-oriented football analytics tools + 1 guarded read-only SQL fallback
 * over the PostgreSQL `sofascore` schema.
 */
export function createLiga1McpServer() {
  const server = new McpServer(
    { name: "liga1-intelligence-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  // 1. scout_players
  server.registerTool(
    "scout_players",
    {
      title: "Scout Indonesia Super League (Liga 1) Players",
      description:
        "Find and rank Indonesia Super League (Liga 1) players by position (GK, CB, FB, DM, CM, AM, W, ST), season (24/25, 25/26, 26/27), age bracket (U23 or Senior), nationality (Local IDN or Foreign), minimum minutes, and tactical style focus (progression, defense_padj, attacking_xg, creative_keypass, balanced). Automatically computes Possession-Adjusted (PAdj) defensive stats per 500 opponent touches, enforces >=35% true positional share, and uses Accurate Long Balls / 90 as the Liga 1 ball progression proxy.",
      inputSchema: z.object({
        position: z.string().optional().describe("Target position, e.g. CM, DM, AM, CB, FB, W, ST, GK"),
        season: z.string().optional().describe("Season label: 24/25, 25/26, or 26/27 (default 26/27)"),
        ageGroup: z.enum(["U23", "Senior", "All"]).optional().describe("Age filter: U23 (<=23), Senior (>23), or All"),
        nationality: z.enum(["Local", "Foreign", "All"]).optional().describe("Local (IDN) or Foreign quota filter"),
        club: z.string().optional().describe("Optional club filter, e.g. Persib Bandung, Persija Jakarta"),
        minMinutes: z.number().optional().describe("Minimum minutes played threshold (default 450, or 180 in ongoing 26/27)"),
        styleFocus: z
          .enum(["progression", "defense_padj", "attacking_xg", "creative_keypass", "balanced"])
          .optional()
          .describe("Tactical ranking emphasis"),
        limit: z.number().optional().describe("Number of top players to return (default 8)"),
      }),
    },
    async (args) => {
      const result = await scoutLiga1Players(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // 2. get_prematch_context
  server.registerTool(
    "get_prematch_context",
    {
      title: "Get Pre-Match Tactical Analysis & Predicted Starting XI Context",
      description:
        "Fetch pre-match tactical profile, recent 5-match form, Open-Play vs Set-Piece xG splits, predicted Starting XI formation, disciplinary card counts, and RAG-backed injury/suspension/doubtful (50/50) availability plus Liga 1 U-23 & Foreign player quota checks. If `awayTeam` is omitted, automatically looks up `homeTeam`'s next scheduled opponent & WIB kickoff time in `sofascore.fact_upcoming_match`.",
      inputSchema: z.object({
        homeTeam: z.string().describe("Club name (or home club), e.g. Persib Bandung, Persija Jakarta, Arsenal"),
        awayTeam: z.string().optional().describe("Optional away club name; omit to auto-detect next scheduled opponent from fact_upcoming_match"),
        league: z.string().optional().describe("Optional league: 'Liga 1', 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'UCL'"),
        season: z.string().optional().describe("Season: 26/27 (default) or 25/26"),
      }),
    },
    async (args) => {
      const result = await getPrematchContext(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // 2b. get_upcoming_fixtures
  server.registerTool(
    "get_upcoming_fixtures",
    {
      title: "Get Upcoming Matchweek Schedule (`sofascore.fact_upcoming_match`)",
      description:
        "Fetch real upcoming scheduled matches (round, home/away clubs, and WIB kickoff times) from `sofascore.fact_upcoming_match` across Liga 1, Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, or UEFA Champions League, optionally filtered by club name.",
      inputSchema: z.object({
        league: z
          .string()
          .optional()
          .describe("League name: 'Liga 1' (default if teamName omitted), 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'UCL'"),
        teamName: z.string().optional().describe("Optional club name filter, e.g. 'Persib', 'Persija', 'Arsenal'"),
        limit: z.number().optional().describe("Max fixtures to return (default 8)"),
      }),
    },
    async (args) => {
      const fixtures = await getUpcomingFixtures({
        league: args.league ?? (args.teamName ? undefined : "Liga 1"),
        teamName: args.teamName,
        limit: args.limit ?? 8,
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ count: fixtures.length, fixtures }, null, 2) }],
      };
    },
  );

  // 3. get_player_report_data
  server.registerTool(
    "get_player_report_data",
    {
      title: "Get Player Scouting & Two-Season Evolution Report Data",
      description:
        "Retrieve full per-90 metrics, Possession-Adjusted (PAdj) defensive stats, positional peer percentile rankings (0-100), and optional two-season evolution deltas (e.g. 25/26 vs 26/27) for a specific Liga 1 player.",
      inputSchema: z.object({
        playerName: z.string().describe("Player name to inspect, e.g. Marc Klok, Rizky Ridho, Beckham Putra, Francisco Rivera"),
        seasonA: z.string().optional().describe("Target/current season, default 26/27"),
        seasonB: z.string().optional().describe("Previous season for 2-season evolution comparison, default 25/26"),
      }),
    },
    async (args) => {
      const result = await getPlayerReportData(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // 4. get_team_style_profile
  server.registerTool(
    "get_team_style_profile",
    {
      title: "Get Club Playing Style, Strengths/Weaknesses & Key Players Profile",
      description:
        "Compute a club's 24-metric Tactical Playing Style (In Possession & Out of Possession) and Performance Efficiency (Attack & Defence) across Overall, Home, Away, and Last 6 Matches, plus auto-extracted Strengths, Weaknesses, Dominant Formations, Top Threats, and Top Creators.",
      inputSchema: z.object({
        teamName: z.string().describe("Club name, e.g. Persib Bandung, Borneo FC, Persija Jakarta, Arsenal, Barcelona"),
        league: z.string().optional().describe("League name: 'Liga 1' (default), 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'UCL'"),
        season: z.string().optional().describe("Season: 26/27 (default), 25/26, or 24/25"),
      }),
    },
    async (args) => {
      const result = await getTeamStyleProfile(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // 5. query_liga1_readonly_sql (Guarded Fallback)
  server.registerTool(
    "query_liga1_readonly_sql",
    {
      title: "Execute Guarded Read-Only SQL Query on Liga 1 PostgreSQL Schema",
      description:
        "Fallback tool for ad-hoc analytical questions not covered by scout_players, get_prematch_context, or get_player_report_data. Executes a strictly read-only SELECT query against sofascore.* tables (dim_player, dim_team, fact_match, fact_player_x_match_stats, fact_team_x_match_stats, fact_shots, fact_incidents) with a 3000ms timeout and LIMIT 50. Indonesia Super League tournament_id = 1015; season_id: 65049 (24/25), 78590 (25/26), 100394 (26/27).",
      inputSchema: z.object({
        sqlQuery: z.string().describe("Read-only SELECT query against sofascore.* tables"),
      }),
    },
    async ({ sqlQuery }) => {
      const cleaned = sqlQuery.trim().replace(/;+$/, "");
      const withLimit = /\bLIMIT\s+\d+/i.test(cleaned) ? cleaned : `${cleaned} LIMIT 50`;
      const rows = await queryReadOnly(withLimit, [], 3000);
      return {
        content: [{ type: "text", text: JSON.stringify({ rowCount: rows.length, rows }, null, 2) }],
      };
    },
  );

  return server;
}
