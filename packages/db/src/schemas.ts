import { z } from "zod";

export const LIGA1_TOURNAMENT_ID = 1015;

export const LIGA1_SEASONS: Record<string, { id: number; label: string; isOngoing: boolean }> = {
  "24/25": { id: 65049, label: "2024/2025", isOngoing: false },
  "25/26": { id: 78590, label: "2025/2026", isOngoing: false },
  "26/27": { id: 100394, label: "2026/2027", isOngoing: true },
};

export function resolveSeasonId(seasonInput?: string | number): {
  seasonId: number;
  seasonKey: string;
  isOngoing: boolean;
} {
  if (typeof seasonInput === "number") {
    for (const [k, v] of Object.entries(LIGA1_SEASONS)) {
      if (v.id === seasonInput) return { seasonId: v.id, seasonKey: k, isOngoing: v.isOngoing };
    }
  }
  const normalized = String(seasonInput ?? "26/27").trim();
  if (normalized.includes("24") || normalized === "65049") {
    return { seasonId: 65049, seasonKey: "24/25", isOngoing: false };
  }
  if (normalized.includes("25") || normalized === "78590") {
    return { seasonId: 78590, seasonKey: "25/26", isOngoing: false };
  }
  return { seasonId: 100394, seasonKey: "26/27", isOngoing: true };
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
