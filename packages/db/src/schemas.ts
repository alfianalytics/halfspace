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

// ============================================================================
// METRIC CATALOGS FOR VISUAL STUDIO & AI CARDS (Player Level + Team Level)
// ============================================================================

export type PlayerMetricDef = {
  key: string;
  tacticalLabel: string;
  technicalCode: string;
  group: "shooting" | "creating" | "passing" | "touches_duels" | "defense_padj";
  groupLabel: string;
  unit?: string;
  inverse?: boolean;
};

export const PLAYER_METRIC_CATALOG: readonly PlayerMetricDef[] = [
  // Shooting
  { key: "goalsPer90", tacticalLabel: "Goal Output", technicalCode: "goals_p90", group: "shooting", groupLabel: "Shooting" },
  { key: "shotsPer90", tacticalLabel: "Shooting Volume", technicalCode: "total_shots_p90", group: "shooting", groupLabel: "Shooting" },
  { key: "nonPenXgPer90", tacticalLabel: "Goal Threat Quality", technicalCode: "non_pen_xg_p90", group: "shooting", groupLabel: "Shooting" },
  { key: "xgotPer90", tacticalLabel: "On-Target Shot Threat", technicalCode: "xgot_p90", group: "shooting", groupLabel: "Shooting" },
  // Creating
  { key: "assistsPer90", tacticalLabel: "Goal Assists", technicalCode: "goal_assist_p90", group: "creating", groupLabel: "Creating" },
  { key: "expectedAssistsPer90", tacticalLabel: "Expected Assists", technicalCode: "expected_assists_p90", group: "creating", groupLabel: "Creating" },
  { key: "keyPassesPer90", tacticalLabel: "Chance Creation", technicalCode: "key_passes_p90", group: "creating", groupLabel: "Creating" },
  { key: "bigChancesCreatedPer90", tacticalLabel: "Big Chances Created", technicalCode: "big_chance_created_p90", group: "creating", groupLabel: "Creating" },
  { key: "accurateCrossesPer90", tacticalLabel: "Accurate Crosses", technicalCode: "accurate_cross_p90", group: "creating", groupLabel: "Creating" },
  // Passing & Progression
  { key: "accuratePassesPer90", tacticalLabel: "Build-Up Pass Volume", technicalCode: "accurate_pass_p90", group: "passing", groupLabel: "Passing & Progression" },
  { key: "passAccuracyPct", tacticalLabel: "Pass Completion %", technicalCode: "accurate_pass_pct", group: "passing", groupLabel: "Passing & Progression", unit: "%" },
  { key: "accurateLongBallsPer90", tacticalLabel: "Long Ball Progression", technicalCode: "accurate_long_balls_p90", group: "passing", groupLabel: "Passing & Progression" },
  { key: "accurateOppositionHalfPassesPer90", tacticalLabel: "Final-Half Territory Passing", technicalCode: "acc_opp_half_passes_p90", group: "passing", groupLabel: "Passing & Progression" },
  // Touches & Duels
  { key: "touchesPer90", tacticalLabel: "Ball Involvement", technicalCode: "touches_p90", group: "touches_duels", groupLabel: "Touches & Duels" },
  { key: "successfulDribblesPer90", tacticalLabel: "1v1 Ball Carrying", technicalCode: "won_contest_p90", group: "touches_duels", groupLabel: "Touches & Duels" },
  { key: "foulsWonPer90", tacticalLabel: "Fouls Drawn", technicalCode: "was_fouled_p90", group: "touches_duels", groupLabel: "Touches & Duels" },
  { key: "duelsWonPer90", tacticalLabel: "Total Duels Won", technicalCode: "duel_won_p90", group: "touches_duels", groupLabel: "Touches & Duels" },
  { key: "aerialWonPer90", tacticalLabel: "Aerial Dominance", technicalCode: "aerial_won_p90", group: "touches_duels", groupLabel: "Touches & Duels" },
  // PAdj Defences
  { key: "padjInterceptions", tacticalLabel: "Proactive Reading (PAdj)", technicalCode: "interceptions_padj500", group: "defense_padj", groupLabel: "Defences (PAdj)" },
  { key: "padjTackles", tacticalLabel: "Ball-Winning Tackles (PAdj)", technicalCode: "tackles_padj500", group: "defense_padj", groupLabel: "Defences (PAdj)" },
  { key: "padjRecoveries", tacticalLabel: "Loose-Ball Recovery (PAdj)", technicalCode: "recoveries_padj500", group: "defense_padj", groupLabel: "Defences (PAdj)" },
  { key: "padjTotalDefense", tacticalLabel: "Total Defensive Output (PAdj)", technicalCode: "total_def_padj500", group: "defense_padj", groupLabel: "Defences (PAdj)" },
] as const;

export type TeamStyleMetricDef = {
  id: string;
  label: string;
  technicalFormula: string;
  mainCategory: "STYLE METRICS" | "PERFORMANCE METRICS";
  subCategory: "IN POSSESSION" | "OUT OF POSSESSION" | "ATTACK" | "DEFENCE";
  description: string;
};

export const TEAM_METRIC_CATALOG: readonly TeamStyleMetricDef[] = [
  // STYLE — IN POSSESSION (8)
  { id: "deep_buildup_g", label: "Deep Build-Up", technicalFormula: "1 - gk_long_balls/gk_passes", mainCategory: "STYLE METRICS", subCategory: "IN POSSESSION", description: "Rasio umpan pendek kiper saat membangun serangan dari bawah" },
  { id: "possession", label: "Possession", technicalFormula: "team_passes / total_passes", mainCategory: "STYLE METRICS", subCategory: "IN POSSESSION", description: "Dominasi penguasaan sirkulasi umpan" },
  { id: "field_tilt_3rd_passes", label: "Field Tilt", technicalFormula: "team_att3rd / total_att3rd", mainCategory: "STYLE METRICS", subCategory: "IN POSSESSION", description: "Dominasi teritorial sentuhan di sepertiga akhir" },
  { id: "dribbles", label: "Dribble Tendencies", technicalFormula: "dribbles_att / touches", mainCategory: "STYLE METRICS", subCategory: "IN POSSESSION", description: "Frekuensi percobaan dribel 1v1 per sentuhan" },
  { id: "central_progression_3rd", label: "Central Progression", technicalFormula: "-crosses / att_3rd_touches", mainCategory: "STYLE METRICS", subCategory: "IN POSSESSION", description: "Kecenderungan membongkar lewat koridor tengah dibanding umpan silang" },
  { id: "patient_3rd", label: "Final 3rd Patience", technicalFormula: "-shots / att_3rd_touches", mainCategory: "STYLE METRICS", subCategory: "IN POSSESSION", description: "Kesabaran mengolah peluang di sepertiga akhir sebelum menembak" },
  { id: "patient_all", label: "Overall Patience", technicalFormula: "-shots / touches", mainCategory: "STYLE METRICS", subCategory: "IN POSSESSION", description: "Tempo sirkulasi keseluruhan dibanding tembakan langsung" },
  { id: "shot_quality", label: "Shot Quality", technicalFormula: "npxg / non_pen_shots", mainCategory: "STYLE METRICS", subCategory: "IN POSSESSION", description: "Kualitas rata-rata peluang per tembakan non-penalti" },
  // STYLE — OUT OF POSSESSION (4)
  { id: "forward_press_w_am_f", label: "Forward Press", technicalFormula: "-opp_build_passes / fwd_def_acts", mainCategory: "STYLE METRICS", subCategory: "OUT OF POSSESSION", description: "Intensitas pressing lini depan terhadap build-up lawan" },
  { id: "defender_press_g_d_cm", label: "Def-Mid Press", technicalFormula: "-opp_att_passes / def_mid_acts", mainCategory: "STYLE METRICS", subCategory: "OUT OF POSSESSION", description: "Agresivitas intervensi bek & gelandang terhadap penyerang lawan" },
  { id: "high_line", label: "High Line", technicalFormula: "(opp_offsides + gk_sweeps)/opp_pass", mainCategory: "STYLE METRICS", subCategory: "OUT OF POSSESSION", description: "Tingginya garis pertahanan (jebakan offside + aksi sweeper kiper)" },
  { id: "discipline_def_actions", label: "Discipline", technicalFormula: "-fouls / (tackles + intercep)", mainCategory: "STYLE METRICS", subCategory: "OUT OF POSSESSION", description: "Kebersihan aksi bertahan tanpa pelanggaran berlebih" },
  // PERFORMANCE — ATTACK (6)
  { id: "open_play_attack", label: "Open Play Attack", technicalFormula: "open_play_xg / match", mainCategory: "PERFORMANCE METRICS", subCategory: "ATTACK", description: "Produktivitas ancaman gol dari permainan terbuka" },
  { id: "set_piece_attack", label: "Set-Piece Attack", technicalFormula: "set_piece_xg / match", mainCategory: "PERFORMANCE METRICS", subCategory: "ATTACK", description: "Ancaman gol dari situasi bola mati (corner, free-kick, throw-in)" },
  { id: "press_resistance", label: "Press Resistance", technicalFormula: "-dispossessed / touches", mainCategory: "PERFORMANCE METRICS", subCategory: "ATTACK", description: "Ketahanan mempertahankan bola dari tekanan lawan" },
  { id: "dribbles_completion", label: "Dribbles Completion", technicalFormula: "dribbles_won / dribbles_att", mainCategory: "PERFORMANCE METRICS", subCategory: "ATTACK", description: "Tingkat keberhasilan melewati lawan (1v1)" },
  { id: "crosses_completion", label: "Crosses Completion", technicalFormula: "acc_crosses / total_crosses", mainCategory: "PERFORMANCE METRICS", subCategory: "ATTACK", description: "Akurasi umpan silang di kotak penalti" },
  { id: "finishing", label: "Finishing Efficiency", technicalFormula: "xgot / xg", mainCategory: "PERFORMANCE METRICS", subCategory: "ATTACK", description: "Ketajaman penempatan tembakan meningkatkan peluang gol (xGOT/xG)" },
  // PERFORMANCE — DEFENCE (6)
  { id: "open_play_defence", label: "Open Play Defence", technicalFormula: "-opp_open_play_xg / match", mainCategory: "PERFORMANCE METRICS", subCategory: "DEFENCE", description: "Kemampuan meredam xG permainan terbuka lawan" },
  { id: "set_piece_defence", label: "Set-Piece Defence", technicalFormula: "-opp_set_piece_xg / match", mainCategory: "PERFORMANCE METRICS", subCategory: "DEFENCE", description: "Kekokohan mengantisipasi bola mati lawan" },
  { id: "disrupt_opp_buildup", label: "Disrupt Opp Build-Up", technicalFormula: "opp_dispossessed / opp_touches", mainCategory: "PERFORMANCE METRICS", subCategory: "DEFENCE", description: "Kemampuan merebut bola langsung dari kaki lawan" },
  { id: "dribbles_defence", label: "Dribbles Defence", technicalFormula: "-opp_dribbles_won / opp_att", mainCategory: "PERFORMANCE METRICS", subCategory: "DEFENCE", description: "Ketangguhan duel 1v1 menghentikan dribel lawan" },
  { id: "crosses_defence", label: "Crosses Defence", technicalFormula: "-opp_acc_cross / opp_cross", mainCategory: "PERFORMANCE METRICS", subCategory: "DEFENCE", description: "Kemampuan memblokir/mematahkan umpan silang lawan" },
  { id: "saving", label: "Shot-Stopping", technicalFormula: "opp_xgot / opp_goals", mainCategory: "PERFORMANCE METRICS", subCategory: "DEFENCE", description: "Performa penyelamatan kiper meredam tembakan tepat sasaran" },
] as const;

// 1. Player Scouting & 2-Season Evolution Visual Card Schema
export const MetricItemSchema = z.object({
  key: z.string(),
  tacticalLabel: z.string(),
  technicalCode: z.string(),
  group: z.string(),
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
  leagueName: z.string().optional(),
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
  position: z.string(),
  side: z.string().optional(),
  x: z.number(),
  y: z.number(),
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
  reason: z.string(),
  status: z.enum(["confirmed_out", "suspended", "international_duty"]),
  citationDocId: z.string(),
});

export const TeamPrematchBlockSchema = z.object({
  teamId: z.number(),
  teamName: z.string(),
  teamColor: z.string(),
  predictedFormation: z.string(),
  recentForm: z.string(),
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

// 3. Peer Comparison Visual Card Schema
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

// 4. Team Tactical Style, Strengths/Weaknesses & Key Players Card (`balbalanalytics` 24-Metric Matrix)
export const TeamSituationMetricsSchema = z.object({
  situation: z.enum(["All", "Home", "Away", "Last 6", "Last 6 Home", "Last 6 Away"]),
  matches: z.number(),
  goalsForPerMatch: z.number(),
  goalsAgainstPerMatch: z.number(),
  values: z.record(z.string(), z.number()), // display values for the 24 metrics
  percentiles: z.record(z.string(), z.number()), // 0-100 percentile ranks
});

export const KeyPlayerPillarSchema = z.object({
  playerId: z.number(),
  playerName: z.string(),
  shortName: z.string(),
  position: z.string(),
  minutesPlayed: z.number(),
  matchesPlayed: z.number(),
  roleType: z.enum(["threat", "creator"]),
  primaryStatLabel: z.string(),
  primaryStatCode: z.string(),
  primaryStatValue: z.number(),
  secondaryStatLabel: z.string(),
  secondaryStatValue: z.number(),
  compositeScore: z.number(),
});

export const StrengthWeaknessItemSchema = z.object({
  metricId: z.string(),
  label: z.string(),
  technicalFormula: z.string(),
  subCategory: z.string(),
  percentile: z.number(),
  displayValue: z.number(),
  description: z.string(),
});

export const TeamStyleProfileCardSchema = z.object({
  cardType: z.literal("team_style_profile"),
  teamId: z.number(),
  teamName: z.string(),
  teamColor: z.string(),
  leagueName: z.string(),
  season: z.string(),
  recentForm: z.string(),
  dominantFormations: z.array(
    z.object({
      formation: z.string(),
      matches: z.number(),
      sharePct: z.number(),
    }),
  ),
  styleArchetypes: z.array(
    z.object({
      tag: z.string(),
      metricId: z.string(),
      percentile: z.number(),
    }),
  ),
  strengths: z.array(StrengthWeaknessItemSchema),
  weaknesses: z.array(StrengthWeaknessItemSchema),
  topThreats: z.array(KeyPlayerPillarSchema),
  topCreators: z.array(KeyPlayerPillarSchema),
  situations: z.array(TeamSituationMetricsSchema),
});

export type TeamStyleProfileCardData = z.infer<typeof TeamStyleProfileCardSchema>;

// 5. Player Custom Ranking Leaderboard Visual Card
export const PlayerRankingCardSchema = z.object({
  cardType: z.literal("player_ranking"),
  title: z.string(),
  subtitle: z.string(),
  leagueName: z.string(),
  season: z.string(),
  metricKey: z.string(),
  metricLabel: z.string(),
  metricCode: z.string(),
  rows: z.array(
    z.object({
      rank: z.number(),
      playerId: z.number(),
      playerName: z.string(),
      shortName: z.string(),
      teamName: z.string(),
      position: z.string(),
      age: z.number(),
      isU23: z.boolean(),
      isLocal: z.boolean(),
      minutesPlayed: z.number(),
      value: z.number(),
      percentile: z.number(),
    }),
  ),
});

export type PlayerRankingCardData = z.infer<typeof PlayerRankingCardSchema>;

// 6. Team X/Y Tactical Scatter Card
export const TeamScatterCardSchema = z.object({
  cardType: z.literal("team_scatter"),
  title: z.string(),
  subtitle: z.string(),
  leagueName: z.string(),
  season: z.string(),
  xMetricId: z.string(),
  xLabel: z.string(),
  xFormula: z.string(),
  yMetricId: z.string(),
  yLabel: z.string(),
  yFormula: z.string(),
  xMedian: z.number(),
  yMedian: z.number(),
  teams: z.array(
    z.object({
      teamId: z.number(),
      teamName: z.string(),
      teamShortName: z.string(),
      teamColor: z.string(),
      matches: z.number(),
      isFocal: z.boolean(),
      xValue: z.number(),
      xPercentile: z.number(),
      yValue: z.number(),
      yPercentile: z.number(),
    }),
  ),
});

export type TeamScatterCardData = z.infer<typeof TeamScatterCardSchema>;

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
