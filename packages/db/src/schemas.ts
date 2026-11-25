import { z } from "zod";

export const LIGA1_TOURNAMENT_ID = 1015;

export const TOURNAMENTS: Record<
  number,
  { id: number; name: string; aliases: string[]; seasons: Record<string, number> }
> = {
  1015: {
    id: 1015,
    name: "Indonesia Super League",
    aliases: ["liga 1", "indonesia", "isl", "super league", "bri liga 1"],
    seasons: { "24/25": 65049, "25/26": 78590, "26/27": 100394 },
  },
  17: {
    id: 17,
    name: "Premier League",
    aliases: ["premier league", "epl", "inggris", "english"],
    seasons: { "21/22": 37036, "24/25": 61627, "25/26": 76986, "26/27": 96668 },
  },
  8: {
    id: 8,
    name: "LaLiga",
    aliases: ["laliga", "la liga", "spanyol", "spain"],
    seasons: { "24/25": 61643, "25/26": 77559, "26/27": 97268 },
  },
  23: {
    id: 23,
    name: "Serie A",
    aliases: ["serie a", "italia", "italy"],
    seasons: { "24/25": 63515, "25/26": 76457, "26/27": 95836 },
  },
  35: {
    id: 35,
    name: "Bundesliga",
    aliases: ["bundesliga", "jerman", "germany"],
    seasons: { "24/25": 63516, "25/26": 77333, "26/27": 97464 },
  },
  34: {
    id: 34,
    name: "Ligue 1",
    aliases: ["ligue 1", "prancis", "france"],
    seasons: { "24/25": 61736, "25/26": 77356, "26/27": 96127 },
  },
  7: {
    id: 7,
    name: "UEFA Champions League",
    aliases: ["ucl", "champions league", "liga champions"],
    seasons: { "24/25": 61644, "25/26": 76953, "26/27": 96518 },
  },
  18: {
    id: 18,
    name: "Championship",
    aliases: ["championship", "efl championship"],
    seasons: { "25/26": 77347 },
  },
};

export const LIGA1_SEASONS: Record<string, { id: number; label: string; isOngoing: boolean }> = {
  "24/25": { id: 65049, label: "2024/2025", isOngoing: false },
  "25/26": { id: 78590, label: "2025/2026", isOngoing: false },
  "26/27": { id: 100394, label: "2026/2027", isOngoing: true },
};

export function resolveLeagueAndSeason(
  leagueInput?: string | number,
  seasonInput?: string | number,
): {
  tournamentId: number;
  tournamentName: string;
  seasonId: number;
  seasonKey: string;
  isOngoing: boolean;
} {
  let tournament = TOURNAMENTS[1015]!;
  if (typeof leagueInput === "number" && TOURNAMENTS[leagueInput]) {
    tournament = TOURNAMENTS[leagueInput]!;
  } else if (typeof leagueInput === "string" && leagueInput.trim()) {
    const q = leagueInput.toLowerCase().trim();
    for (const t of Object.values(TOURNAMENTS)) {
      if (
        String(t.id) === q ||
        t.name.toLowerCase().includes(q) ||
        t.aliases.some((a) => q.includes(a))
      ) {
        tournament = t;
        break;
      }
    }
  }

  const normalizedSeason = String(seasonInput ?? "26/27").trim();
  let seasonKey = "26/27";
  if (normalizedSeason.includes("21")) seasonKey = "21/22";
  else if (normalizedSeason.includes("24")) seasonKey = "24/25";
  else if (normalizedSeason.includes("25")) seasonKey = "25/26";
  else seasonKey = "26/27";

  // Check if seasonInput was a direct numeric season_id
  if (typeof seasonInput === "number" || /^\d{4,6}$/.test(normalizedSeason)) {
    const numId = Number(normalizedSeason);
    for (const t of Object.values(TOURNAMENTS)) {
      for (const [sKey, sId] of Object.entries(t.seasons)) {
        if (sId === numId) {
          return {
            tournamentId: t.id,
            tournamentName: t.name,
            seasonId: sId,
            seasonKey: sKey,
            isOngoing: sKey === "26/27",
          };
        }
      }
    }
  }

  const seasonId =
    tournament.seasons[seasonKey] ??
    tournament.seasons["26/27"] ??
    tournament.seasons["25/26"] ??
    Object.values(tournament.seasons)[0]!;

  return {
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    seasonId,
    seasonKey,
    isOngoing: seasonKey === "26/27",
  };
}

export function resolveSeasonId(seasonInput?: string | number): {
  seasonId: number;
  seasonKey: string;
  isOngoing: boolean;
} {
  const res = resolveLeagueAndSeason(1015, seasonInput);
  return { seasonId: res.seasonId, seasonKey: res.seasonKey, isOngoing: res.isOngoing };
}

// 1. Player Scouting & 2-Season Evolution Visual Card Schema
export const MetricItemSchema = z.object({
  key: z.string(),
  tacticalLabel: z.string(), // e.g. "Long Ball Progression"
  technicalCode: z.string(), // e.g. "Acc. Long Balls / 90"
  group: z.enum(["attacking", "progression", "defense_padj", "duels"]),
  valuePer90: z.number(),
  prevValuePer90: z.number().optional(),
  percentile: z.number().min(0).max(100),
  prevPercentile: z.number().min(0).max(100).optional(),
  unit: z.string().optional(),
});

export const PlayerScoutingCardSchema = z.object({
  cardType: z.literal("player_scouting"),
  playerId: z.number(),
  playerName: z.string(),
  shortName: z.string(),
  teamName: z.string(),
  teamColor: z.string().optional(),
  age: z.number(),
  isU23: z.boolean(),
  nationality: z.string(),
  isLocal: z.boolean(),
  primaryPosition: z.string(),
  positionSharePct: z.number(),
  season: z.string(),
  prevSeason: z.string().optional(),
  minutesPlayed: z.number(),
  prevMinutesPlayed: z.number().optional(),
  matchesPlayed: z.number(),
  earlySeasonSample: z.boolean(),
  lowSampleWarning: z.boolean(),
  peerCount: z.number(),
  metrics: z.array(MetricItemSchema),
  tacticalSummary: z.string(),
});

export type PlayerScoutingCardData = z.infer<typeof PlayerScoutingCardSchema>;

// 2. Pre-Match & Predicted Starting XI Visual Card Schema
export const LineupPlayerNodeSchema = z.object({
  playerId: z.number(),
  name: z.string(),
  shortName: z.string(),
  number: z.number().optional(),
  position: z.string(), // GK, CB, LB, RB, DM, CM, AM, LW, RW, ST
  side: z.string().optional(), // L, C, R
  x: z.number(), // 0-100 pitch x
  y: z.number(), // 0-100 pitch y
  isU23: z.boolean(),
  isLocal: z.boolean(),
  minutesLast5: z.number(),
  ratingLast5: z.number(),
  yellowCardsSeason: z.number(),
  status: z.enum(["starter", "doubtful"]),
  doubtfulReason: z.string().optional(),
  backupPlayerName: z.string().optional(),
  citationDocId: z.string().optional(),
});

export const SidelinedPlayerSchema = z.object({
  playerName: z.string(),
  position: z.string(),
  reason: z.string(), // e.g. "Hamstring injury", "Yellow card accumulation (4 YC)", "Timnas call-up"
  status: z.enum(["confirmed_out", "suspended", "international_duty"]),
  citationDocId: z.string(),
});

export const TeamPrematchBlockSchema = z.object({
  teamId: z.number(),
  teamName: z.string(),
  teamColor: z.string(),
  predictedFormation: z.string(),
  recentForm: z.string(), // e.g. "W-W-D-L-W"
  stats: z.object({
    goalsPerMatch: z.number(),
    openPlayXgPerMatch: z.number(),
    setPieceXgPerMatch: z.number(),
    nonPenXgPerMatch: z.number(),
    possessionPct: z.number(),
    att3rdTouchSharePct: z.number(),
    padjDefensiveActions: z.number(),
  }),
  quotaCheck: z.object({
    u23StartersCount: z.number(),
    foreignStartersCount: z.number(),
    compliesWithLiga1Rules: z.boolean(),
    ruleCitationDocId: z.string(),
  }),
  startingXI: z.array(LineupPlayerNodeSchema),
  sidelined: z.array(SidelinedPlayerSchema),
});

export const PrematchLineupCardSchema = z.object({
  cardType: z.literal("prematch_lineup"),
  season: z.string(),
  matchLabel: z.string(),
  homeTeam: TeamPrematchBlockSchema,
  awayTeam: TeamPrematchBlockSchema,
  keyMatchupNotes: z.array(z.string()),
});

export type PrematchLineupCardData = z.infer<typeof PrematchLineupCardSchema>;

// 3. Peer Comparison Visual Card Schema (2 players = Head-to-Head Bars; >=3 players = 2D Scatter Quadrant)
export const PeerComparisonPointSchema = z.object({
  playerId: z.number(),
  playerName: z.string(),
  shortName: z.string(),
  teamName: z.string(),
  age: z.number(),
  isU23: z.boolean(),
  nationality: z.string(),
  isLocal: z.boolean(),
  position: z.string(),
  minutesPlayed: z.number(),
  isFocal: z.boolean(),
  xValue: z.number(),
  yValue: z.number(),
  metrics: z.record(z.string(), z.number()),
});

export const PeerComparisonCardSchema = z.object({
  cardType: z.literal("peer_comparison"),
  mode: z.enum(["head_to_head_bars", "scatter_quadrant"]),
  title: z.string(),
  subtitle: z.string(),
  season: z.string(),
  positionGroup: z.string(),
  xAxisLabel: z.string(),
  xAxisCode: z.string(),
  yAxisLabel: z.string(),
  yAxisCode: z.string(),
  xMedian: z.number(),
  yMedian: z.number(),
  players: z.array(PeerComparisonPointSchema),
});

export type PeerComparisonCardData = z.infer<typeof PeerComparisonCardSchema>;

// Rag Document Chunk Schema
export const RagDocumentSchema = z.object({
  docId: z.string(),
  title: z.string(),
  category: z.enum(["news", "regulation", "methodology", "tactical_profile"]),
  club: z.string().optional(),
  player: z.string().optional(),
  publishedDate: z.string(),
  sourceUrl: z.string(),
  content: z.string(),
});

export type RagDocument = z.infer<typeof RagDocumentSchema>;
