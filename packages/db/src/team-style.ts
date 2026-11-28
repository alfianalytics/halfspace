import { ensureHalfspaceSchema, getPgPool, queryReadOnly } from "./client.js";
import { fetchSeasonPlayerCohort, type RawAggregatedPlayer } from "./analytics.js";
import {
  PLAYER_METRIC_CATALOG,
  resolveLeagueAndSeason,
  TEAM_METRIC_CATALOG,
  TOURNAMENTS,
  type PeerComparisonCardData,
  type PlayerRankingCardData,
  type PlayerScoutingCardData,
  type TeamScatterCardData,
  type TeamStyleProfileCardData,
} from "./schemas.js";

function num(v: unknown, decimals = 2): number {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function pctRank(value: number, cohort: number[]): number {
  const valid = cohort.filter((v) => Number.isFinite(v));
  if (valid.length <= 1) return 50;
  const below = valid.filter((v) => v < value).length;
  const equal = valid.filter((v) => v === value).length;
  return Math.min(99, Math.max(1, Math.round(((below + 0.5 * equal) / valid.length) * 100)));
}

export type ComputedTeamSituationRow = {
  teamId: number;
  teamName: string;
  teamShortName: string;
  teamColor: string;
  situation: "All" | "Home" | "Away" | "Last 6" | "Last 6 Home" | "Last 6 Away";
  matches: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  rawScores: Record<string, number>; // directional score used for percentile ranking (inversed where needed)
  displayValues: Record<string, number>; // human-readable value displayed next to bar
  percentiles: Record<string, number>; // 0-100 against League 'All' situation
};

const teamStyleCache = new Map<string, { expiresAt: number; rows: ComputedTeamSituationRow[] }>();
const TEAM_STYLE_TTL_MS = 10 * 60 * 1000;

type MatchTeamRow = {
  match_id: number;
  match_datetime: string;
  team_id: number;
  team_name: string;
  team_short_name: string;
  team_color: string;
  opponent_id: number;
  is_home: boolean;
  formation: string;
  team_score: number;
  opp_score: number;
  team_passes: number;
  opp_passes: number;
  team_touches: number;
  opp_touches: number;
  team_att3rd: number;
  opp_att3rd: number;
  team_dribbles: number;
  team_dribbles_total: number;
  opp_dribbles: number;
  opp_dribbles_total: number;
  team_crosses: number;
  team_crosses_total: number;
  opp_crosses: number;
  opp_crosses_total: number;
  team_total_shots: number;
  team_npshots: number;
  team_npxg: number;
  team_xg: number;
  team_xgot: number;
  opp_xgot: number;
  team_opxg: number;
  opp_opxg: number;
  team_spxg: number;
  opp_spxg: number;
  team_dispossessed: number;
  opp_dispossessed: number;
  team_tackles: number;
  team_interceptions: number;
  team_fouls: number;
  opp_offsides: number;
  team_keeper_sweeper: number;
  gk_passes: number;
  gk_long_balls: number;
  fwd_def_acts: number;
  def_mid_acts: number;
  opp_build_passes: number;
  opp_att_passes: number;
};

function compute24MetricsFromMatches(
  teamId: number,
  teamName: string,
  teamShortName: string,
  teamColor: string,
  situation: ComputedTeamSituationRow["situation"],
  matches: MatchTeamRow[],
): Omit<ComputedTeamSituationRow, "percentiles"> {
  const n = Math.max(1, matches.length);
  const sum = (fn: (m: MatchTeamRow) => number) => matches.reduce((acc, m) => acc + (Number(fn(m)) || 0), 0);

  const goalsFor = sum((m) => m.team_score) / n;
  const goalsAgainst = sum((m) => m.opp_score) / n;

  const gkPasses = sum((m) => m.gk_passes);
  const gkLong = sum((m) => m.gk_long_balls);
  const teamPasses = sum((m) => m.team_passes);
  const oppPasses = sum((m) => m.opp_passes);
  const teamAtt3rd = sum((m) => m.team_att3rd);
  const oppAtt3rd = sum((m) => m.opp_att3rd);
  const teamTouches = Math.max(1, sum((m) => m.team_touches));
  const oppTouches = Math.max(1, sum((m) => m.opp_touches));
  const teamDrib = sum((m) => m.team_dribbles);
  const teamDribTot = sum((m) => m.team_dribbles_total);
  const oppDrib = sum((m) => m.opp_dribbles);
  const oppDribTot = sum((m) => m.opp_dribbles_total);
  const teamCross = sum((m) => m.team_crosses);
  const teamCrossTot = sum((m) => m.team_crosses_total);
  const oppCross = sum((m) => m.opp_crosses);
  const oppCrossTot = sum((m) => m.opp_crosses_total);
  const teamShots = sum((m) => m.team_total_shots);
  const teamNpShots = Math.max(1, sum((m) => m.team_npshots));
  const teamNpXg = sum((m) => m.team_npxg);
  const teamXg = Math.max(0.1, sum((m) => m.team_xg));
  const teamXgot = sum((m) => m.team_xgot);
  const oppXgot = sum((m) => m.opp_xgot);
  const oppGoalsTotal = Math.max(0.5, sum((m) => m.opp_score));

  const fwdDefActs = Math.max(1, sum((m) => m.fwd_def_acts));
  const defMidActs = Math.max(1, sum((m) => m.def_mid_acts));
  const oppBuildPasses = sum((m) => m.opp_build_passes);
  const oppAttPasses = sum((m) => m.opp_att_passes);

  const oppOffsides = sum((m) => m.opp_offsides);
  const gkSweep = sum((m) => m.team_keeper_sweeper);
  const teamFouls = sum((m) => m.team_fouls);
  const teamDefActs = Math.max(1, sum((m) => m.team_tackles + m.team_interceptions));

  const opAttack = sum((m) => m.team_opxg) / n;
  const opDefRaw = sum((m) => m.opp_opxg) / n;
  const spAttack = sum((m) => m.team_spxg) / n;
  const spDefRaw = sum((m) => m.opp_spxg) / n;
  const teamDisp = sum((m) => m.team_dispossessed);
  const oppDisp = sum((m) => m.opp_dispossessed);

  // Exact 24 directional scores mirroring balbalanalytics/helpers.py
  const deepBuildup = gkPasses > 0 ? 1 - gkLong / gkPasses : 0.55;
  const possession = teamPasses + oppPasses > 0 ? teamPasses / (teamPasses + oppPasses) : 0.5;
  const fieldTilt = teamAtt3rd + oppAtt3rd > 0 ? teamAtt3rd / (teamAtt3rd + oppAtt3rd) : 0.5;
  const dribbles = teamDribTot / teamTouches;
  const centralProg = teamAtt3rd > 0 ? -(teamCrossTot / teamAtt3rd) : -0.12;
  const patient3rd = teamAtt3rd > 0 ? -(teamShots / teamAtt3rd) : -0.1;
  const patientAll = -(teamShots / teamTouches);
  const shotQuality = teamNpXg / teamNpShots;

  const forwardPress = -(oppBuildPasses / fwdDefActs);
  const defMidPress = -(oppAttPasses / defMidActs);
  const highLine = oppPasses > 0 ? (oppOffsides + gkSweep) / oppPasses : 0;
  const discipline = -(teamFouls / teamDefActs);

  const pressRes = -(teamDisp / teamTouches);
  const disruptOpp = oppDisp / oppTouches;
  const dribComp = teamDribTot > 0 ? teamDrib / teamDribTot : 0.45;
  const dribDef = oppDribTot > 0 ? -(oppDrib / oppDribTot) : -0.45;
  const crossComp = teamCrossTot > 0 ? teamCross / teamCrossTot : 0.22;
  const crossDef = oppCrossTot > 0 ? -(oppCross / oppCrossTot) : -0.22;
  const finishing = teamXgot / teamXg;
  const saving = oppXgot / oppGoalsTotal;

  const rawScores: Record<string, number> = {
    deep_buildup_g: deepBuildup,
    possession,
    field_tilt_3rd_passes: fieldTilt,
    dribbles,
    central_progression_3rd: centralProg,
    patient_3rd: patient3rd,
    patient_all: patientAll,
    shot_quality: shotQuality,
    forward_press_w_am_f: forwardPress,
    defender_press_g_d_cm: defMidPress,
    high_line: highLine,
    discipline_def_actions: discipline,
    open_play_attack: opAttack,
    open_play_defence: -opDefRaw,
    set_piece_attack: spAttack,
    set_piece_defence: -spDefRaw,
    press_resistance: pressRes,
    disrupt_opp_buildup: disruptOpp,
    dribbles_completion: dribComp,
    dribbles_defence: dribDef,
    crosses_completion: crossComp,
    crosses_defence: crossDef,
    finishing,
    saving,
  };

  // Human-readable display values (matching helpers.py scaling like *100 for % or *500 for per-500)
  const displayValues: Record<string, number> = {
    deep_buildup_g: num(deepBuildup * 100, 1),
    possession: num(possession * 100, 1),
    field_tilt_3rd_passes: num(fieldTilt * 100, 1),
    dribbles: num(dribbles * 100, 2),
    central_progression_3rd: num(centralProg, 2),
    patient_3rd: num(patient3rd, 2),
    patient_all: num(patientAll * 100, 2),
    shot_quality: num(shotQuality, 2),
    forward_press_w_am_f: num(forwardPress, 1),
    defender_press_g_d_cm: num(defMidPress, 1),
    high_line: num(highLine * 500, 2),
    discipline_def_actions: num(discipline, 2),
    open_play_attack: num(opAttack, 2),
    open_play_defence: num(opDefRaw, 2),
    set_piece_attack: num(spAttack, 2),
    set_piece_defence: num(spDefRaw, 2),
    press_resistance: num(pressRes * 500, 2),
    disrupt_opp_buildup: num(disruptOpp * 500, 2),
    dribbles_completion: num(dribComp * 100, 1),
    dribbles_defence: num(Math.abs(dribDef) * 100, 1),
    crosses_completion: num(crossComp * 100, 1),
    crosses_defence: num(Math.abs(crossDef) * 100, 1),
    finishing: num(finishing, 2),
    saving: num(saving, 2),
  };

  return {
    teamId,
    teamName,
    teamShortName,
    teamColor,
    situation,
    matches: matches.length,
    goalsForPerMatch: num(goalsFor, 2),
    goalsAgainstPerMatch: num(goalsAgainst, 2),
    rawScores,
    displayValues,
  };
}

/**
 * Computes & caches all 24 `balbalanalytics` Team Style & Performance metrics
 * across `All`, `Home`, `Away`, `Last 6`, `Last 6 Home`, `Last 6 Away` for every club in a league/season.
 */
export async function fetchLeagueTeamStyles(
  leagueInput?: string | number,
  seasonInput?: string | number,
): Promise<ComputedTeamSituationRow[]> {
  const { tournamentId, seasonId } = resolveLeagueAndSeason(leagueInput, seasonInput);
  const cacheKey = `${tournamentId}:${seasonId}`;

  const mem = teamStyleCache.get(cacheKey);
  if (mem && mem.expiresAt > Date.now()) {
    return mem.rows;
  }

  await ensureHalfspaceSchema();

  // Check materialized PostgreSQL table `halfspace.agg_team_style_all` first
  try {
    const dbRes = await getPgPool().query(
      `SELECT payload FROM halfspace.agg_team_style_all WHERE tournament_id = $1 AND season_id = $2`,
      [tournamentId, seasonId],
    );
    if (dbRes.rows.length >= 10) {
      const parsed = dbRes.rows.map((r) => r.payload as ComputedTeamSituationRow);
      teamStyleCache.set(cacheKey, { expiresAt: Date.now() + TEAM_STYLE_TTL_MS, rows: parsed });
      return parsed;
    }
  } catch {
    // compute fresh below
  }

  const sql = `
    WITH player_match_role AS (
      SELECT
        ps.match_id,
        ps.team_id,
        SUM(COALESCE(ps.total_pass, 0)) FILTER (WHERE ps.position = 'G' OR ps.final_position = 'GK') AS gk_passes,
        SUM(COALESCE(ps.total_long_balls, 0)) FILTER (WHERE ps.position = 'G' OR ps.final_position = 'GK') AS gk_long_balls,
        SUM(COALESCE(ps.total_tackle, 0) + COALESCE(ps.interception_won, 0))
          FILTER (WHERE COALESCE(ps.final_position, ps.position) IN ('W', 'LW', 'RW', 'AM', 'F', 'ST', 'CF')) AS fwd_def_acts,
        SUM(COALESCE(ps.total_tackle, 0) + COALESCE(ps.interception_won, 0))
          FILTER (WHERE COALESCE(ps.final_position, ps.position) IN ('GK', 'G', 'CB', 'FB', 'WB', 'LB', 'RB', 'D', 'DM', 'CM', 'M')) AS def_mid_acts,
        SUM(COALESCE(ps.total_pass, 0))
          FILTER (WHERE COALESCE(ps.final_position, ps.position) IN ('GK', 'G', 'CB', 'FB', 'WB', 'LB', 'RB', 'D', 'DM', 'CM')) AS build_passes,
        SUM(COALESCE(ps.total_pass, 0))
          FILTER (WHERE COALESCE(ps.final_position, ps.position) IN ('W', 'LW', 'RW', 'AM', 'F', 'ST', 'CF')) AS att_passes
      FROM sofascore.fact_player_x_match_stats ps
      WHERE ps.tournament_id = $1 AND ps.season_id = $2
      GROUP BY ps.match_id, ps.team_id
    )
    SELECT
      ts.match_id,
      m.match_datetime,
      ts.team_id,
      COALESCE(dt.team_name, 'Club #' || ts.team_id::text) AS team_name,
      COALESCE(dt.team_short_name, dt.team_name, 'Club') AS team_short_name,
      COALESCE(dt.team_primary_color, '#6EE7B7') AS team_color,
      ts.opponent_id,
      COALESCE(ts.is_home, m.home_team_id = ts.team_id) AS is_home,
      COALESCE(ts.formation, '4-3-3') AS formation,
      COALESCE(ts.score, CASE WHEN m.home_team_id = ts.team_id THEN m.home_score ELSE m.away_score END, 0) AS team_score,
      COALESCE(opp.score, CASE WHEN m.home_team_id = ts.team_id THEN m.away_score ELSE m.home_score END, 0) AS opp_score,
      COALESCE(ts.passes, 0) AS team_passes,
      COALESCE(opp.passes, 0) AS opp_passes,
      COALESCE(ts.touches_player, ts.touches_heatmap, 450) AS team_touches,
      COALESCE(opp.touches_player, opp.touches_heatmap, 450) AS opp_touches,
      COALESCE(ts.att_3rd_touches, 110) AS team_att3rd,
      COALESCE(opp.att_3rd_touches, 110) AS opp_att3rd,
      COALESCE(ts.dribbles, 0) AS team_dribbles,
      COALESCE(ts.dribbles__total, 1) AS team_dribbles_total,
      COALESCE(opp.dribbles, 0) AS opp_dribbles,
      COALESCE(opp.dribbles__total, 1) AS opp_dribbles_total,
      COALESCE(ts.crosses, 0) AS team_crosses,
      COALESCE(ts.crosses__total, 1) AS team_crosses_total,
      COALESCE(opp.crosses, 0) AS opp_crosses,
      COALESCE(opp.crosses__total, 1) AS opp_crosses_total,
      COALESCE(ts.total_shots, 1) AS team_total_shots,
      COALESCE(ts.non_pen_shots, ts.total_shots, 1) AS team_npshots,
      COALESCE(ts.non_pen_xg, ts.xg, ts.expected_goals, 0) AS team_npxg,
      COALESCE(ts.xg, ts.expected_goals, 0.1) AS team_xg,
      COALESCE(ts.xgot, 0) AS team_xgot,
      COALESCE(opp.xgot, 0) AS opp_xgot,
      COALESCE(ts.open_play_xg, ts.non_pen_xg, 0) AS team_opxg,
      COALESCE(opp.open_play_xg, opp.non_pen_xg, 0) AS opp_opxg,
      COALESCE(ts.set_piece_xg, 0) AS team_spxg,
      COALESCE(opp.set_piece_xg, 0) AS opp_spxg,
      COALESCE(ts.dispossessed, 0) AS team_dispossessed,
      COALESCE(opp.dispossessed, 0) AS opp_dispossessed,
      COALESCE(ts.total_tackles, ts.tackles, 0) AS team_tackles,
      COALESCE(ts.interceptions, 0) AS team_interceptions,
      COALESCE(ts.fouls, 0) AS team_fouls,
      COALESCE(opp.offsides, 0) AS opp_offsides,
      COALESCE(ts.total_keeper_sweeper, 0) AS team_keeper_sweeper,
      COALESCE(pmr.gk_passes, 25) AS gk_passes,
      COALESCE(pmr.gk_long_balls, 10) AS gk_long_balls,
      COALESCE(pmr.fwd_def_acts, 4) AS fwd_def_acts,
      COALESCE(pmr.def_mid_acts, 14) AS def_mid_acts,
      COALESCE(opmr.build_passes, 180) AS opp_build_passes,
      COALESCE(opmr.att_passes, 95) AS opp_att_passes
    FROM sofascore.fact_team_x_match_stats ts
    JOIN sofascore.fact_match m
      ON m.match_id = ts.match_id AND m.tournament_id = ts.tournament_id AND m.season_id = ts.season_id
    LEFT JOIN sofascore.fact_team_x_match_stats opp
      ON opp.match_id = ts.match_id AND opp.team_id = ts.opponent_id
    LEFT JOIN sofascore.dim_team dt ON dt.team_id = ts.team_id
    LEFT JOIN player_match_role pmr ON pmr.match_id = ts.match_id AND pmr.team_id = ts.team_id
    LEFT JOIN player_match_role opmr ON opmr.match_id = ts.match_id AND opmr.team_id = ts.opponent_id
    WHERE ts.tournament_id = $1 AND ts.season_id = $2
    ORDER BY m.match_datetime DESC;
  `;

  const matchRows = await queryReadOnly<MatchTeamRow>(sql, [tournamentId, seasonId], 30000);
  if (matchRows.length === 0) return [];

  const byTeam = new Map<number, MatchTeamRow[]>();
  for (const r of matchRows) {
    const tid = Number(r.team_id);
    const list = byTeam.get(tid) ?? [];
    list.push(r);
    byTeam.set(tid, list);
  }

  const unranked: Array<Omit<ComputedTeamSituationRow, "percentiles">> = [];

  for (const [tid, tMatches] of byTeam.entries()) {
    // Already sorted DESC by match_datetime
    const sample = tMatches[0]!;
    const tName = String(sample.team_name);
    const tShort = String(sample.team_short_name);
    const tColor = String(sample.team_color || "#6EE7B7");

    const homeMatches = tMatches.filter((m) => Boolean(m.is_home));
    const awayMatches = tMatches.filter((m) => !m.is_home);
    const last6 = tMatches.slice(0, 6);
    const last6Home = last6.filter((m) => Boolean(m.is_home));
    const last6Away = last6.filter((m) => !m.is_home);

    unranked.push(compute24MetricsFromMatches(tid, tName, tShort, tColor, "All", tMatches));
    if (homeMatches.length > 0) {
      unranked.push(compute24MetricsFromMatches(tid, tName, tShort, tColor, "Home", homeMatches));
    }
    if (awayMatches.length > 0) {
      unranked.push(compute24MetricsFromMatches(tid, tName, tShort, tColor, "Away", awayMatches));
    }
    if (last6.length > 0) {
      unranked.push(compute24MetricsFromMatches(tid, tName, tShort, tColor, "Last 6", last6));
    }
    if (last6Home.length > 0) {
      unranked.push(compute24MetricsFromMatches(tid, tName, tShort, tColor, "Last 6 Home", last6Home));
    }
    if (last6Away.length > 0) {
      unranked.push(compute24MetricsFromMatches(tid, tName, tShort, tColor, "Last 6 Away", last6Away));
    }
  }

  // Reference distribution = League 'All' situation across all teams (mirrors balbalanalytics/helpers.py)
  const globalAll = unranked.filter((r) => r.situation === "All");
  const metricIds = TEAM_METRIC_CATALOG.map((m) => m.id);

  const rankedRows: ComputedTeamSituationRow[] = unranked.map((row) => {
    const percentiles: Record<string, number> = {};
    for (const mId of metricIds) {
      const refVals = globalAll.map((g) => g.rawScores[mId] ?? 0);
      percentiles[mId] = pctRank(row.rawScores[mId] ?? 0, refVals);
    }
    return {
      ...row,
      percentiles,
    };
  });

  teamStyleCache.set(cacheKey, { expiresAt: Date.now() + TEAM_STYLE_TTL_MS, rows: rankedRows });

  // Persist to `halfspace.agg_team_style_all` in background
  void (async () => {
    try {
      const client = await getPgPool().connect();
      try {
        const vals: any[] = [];
        const ph: string[] = [];
        let idx = 1;
        for (const r of rankedRows) {
          ph.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}::jsonb, NOW())`);
          vals.push(tournamentId, seasonId, r.teamId, r.situation, JSON.stringify(r));
        }
        if (ph.length > 0) {
          await client.query(
            `INSERT INTO halfspace.agg_team_style_all (tournament_id, season_id, team_id, situation, payload, updated_at)
             VALUES ${ph.join(", ")}
             ON CONFLICT (tournament_id, season_id, team_id, situation)
             DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
            vals,
          );
        }
      } finally {
        client.release();
      }
    } catch {
      // ignore background cache error
    }
  })();

  return rankedRows;
}

/**
 * Full Team Tactical Style, Strengths & Weaknesses, Dominant Formations & Key Players (Threats + Creators)
 */
export async function getTeamStyleProfile(input: {
  teamName: string;
  league?: string | number;
  season?: string | number;
}): Promise<{
  found: boolean;
  message?: string;
  card?: TeamStyleProfileCardData;
}> {
  const resolved = resolveLeagueAndSeason(input.league, input.season ?? "26/27");
  let styleRows = await fetchLeagueTeamStyles(resolved.tournamentId, resolved.seasonKey);
  let activeSeasonKey = resolved.seasonKey;
  let activeSeasonId = resolved.seasonId;

  const q = input.teamName.toLowerCase().trim();
  let teamSituations = styleRows.filter(
    (r) =>
      r.teamName.toLowerCase().includes(q) ||
      r.teamShortName.toLowerCase().includes(q) ||
      String(r.teamId) === q,
  );

  // Fallback to 25/26 if team has no matches in ongoing 26/27 yet
  if (teamSituations.length === 0 && resolved.seasonKey === "26/27") {
    const prev = resolveLeagueAndSeason(resolved.tournamentId, "25/26");
    const prevRows = await fetchLeagueTeamStyles(prev.tournamentId, "25/26");
    const matchedPrev = prevRows.filter(
      (r) =>
        r.teamName.toLowerCase().includes(q) ||
        r.teamShortName.toLowerCase().includes(q) ||
        String(r.teamId) === q,
    );
    if (matchedPrev.length > 0) {
      teamSituations = matchedPrev;
      activeSeasonKey = "25/26";
      activeSeasonId = prev.seasonId;
    }
  }

  if (teamSituations.length === 0) {
    return {
      found: false,
      message: `Club "${input.teamName}" was not found in ${resolved.tournamentName} (${resolved.seasonKey}).`,
    };
  }

  // Pick the unique teamId with most matches in case substring matched 2 clubs
  const allSit = teamSituations
    .filter((r) => r.situation === "All")
    .sort((a, b) => b.matches - a.matches)[0] ?? teamSituations[0]!;

  const targetTeamId = allSit.teamId;
  const targetSits = teamSituations.filter((r) => r.teamId === targetTeamId);

  // Extract Playing Style Archetypes from STYLE METRICS
  const styleDefs = TEAM_METRIC_CATALOG.filter((m) => m.mainCategory === "STYLE METRICS");
  const styleArchetypes: TeamStyleProfileCardData["styleArchetypes"] = [];

  for (const m of styleDefs) {
    const pct = allSit.percentiles[m.id] ?? 50;
    if (pct >= 72) {
      styleArchetypes.push({ tag: `High ${m.label}`, metricId: m.id, percentile: pct });
    } else if (pct <= 25) {
      const oppositeMap: Record<string, string> = {
        deep_buildup_g: "Direct Long-Ball GK",
        possession: "Low-Block Counter",
        central_progression_3rd: "Wing & Cross Heavy",
        patient_3rd: "Direct Early Shooting",
        high_line: "Deep Defensive Block",
      };
      if (oppositeMap[m.id]) {
        styleArchetypes.push({ tag: oppositeMap[m.id]!, metricId: m.id, percentile: pct });
      }
    }
  }
  styleArchetypes.sort((a, b) => Math.abs(b.percentile - 50) - Math.abs(a.percentile - 50));

  // Extract Strengths (>= P68) & Weaknesses (<= P38) from PERFORMANCE METRICS
  const perfDefs = TEAM_METRIC_CATALOG.filter((m) => m.mainCategory === "PERFORMANCE METRICS");
  const rankedPerf = perfDefs
    .map((m) => ({
      metricId: m.id,
      label: m.label,
      technicalFormula: m.technicalFormula,
      subCategory: m.subCategory,
      percentile: allSit.percentiles[m.id] ?? 50,
      displayValue: allSit.displayValues[m.id] ?? 0,
      description: m.description,
    }))
    .sort((a, b) => b.percentile - a.percentile);

  const strengths = rankedPerf.filter((p) => p.percentile >= 65).slice(0, 4);
  if (strengths.length === 0) strengths.push(...rankedPerf.slice(0, 2));

  const weaknesses = [...rankedPerf]
    .reverse()
    .filter((p) => p.percentile <= 52)
    .slice(0, 4);
  if (weaknesses.length < 2) {
    const lowestTwo = [...rankedPerf].reverse().slice(0, 2);
    for (const item of lowestTwo) {
      if (!weaknesses.some((w) => w.metricId === item.metricId)) {
        weaknesses.push(item);
      }
    }
  }

  // Dominant Formations & Recent 5-Match Form
  const [formationRows, recentMatches, playerCohort] = await Promise.all([
    queryReadOnly(
      `SELECT COALESCE(formation, '4-3-3') AS formation, COUNT(DISTINCT match_id) AS matches
       FROM sofascore.fact_team_x_match_stats
       WHERE tournament_id = $1 AND season_id = $2 AND team_id = $3
       GROUP BY 1
       ORDER BY matches DESC
       LIMIT 4`,
      [resolved.tournamentId, activeSeasonId, targetTeamId],
    ),
    queryReadOnly(
      `SELECT home_team_id, home_score, away_score
       FROM sofascore.fact_match
       WHERE tournament_id = $1 AND season_id = $2
         AND (home_team_id = $3 OR away_team_id = $3)
         AND home_score IS NOT NULL
       ORDER BY match_datetime DESC
       LIMIT 5`,
      [resolved.tournamentId, activeSeasonId, targetTeamId],
    ),
    fetchSeasonPlayerCohort(activeSeasonKey, resolved.tournamentId),
  ]);

  const totalFormMatches = Math.max(
    1,
    formationRows.reduce((acc, r) => acc + Number(r.matches ?? 0), 0),
  );
  const dominantFormations = formationRows.map((r) => ({
    formation: String(r.formation),
    matches: Number(r.matches ?? 0),
    sharePct: Math.round((Number(r.matches ?? 0) / totalFormMatches) * 100),
  }));

  const formChars = recentMatches.map((m) => {
    const isH = Number(m.home_team_id) === targetTeamId;
    const gf = Number(isH ? m.home_score : m.away_score);
    const ga = Number(isH ? m.away_score : m.home_score);
    return gf > ga ? "W" : gf === ga ? "D" : "L";
  });

  // Top Threats & Top Creators (mirrors balbalanalytics/helpers.py get_top_threats & get_top_creators)
  const teamPlayers = playerCohort.filter((p) => p.teamId === targetTeamId);
  const minMinsThreshold = Math.max(180, Math.min(450, (allSit.matches * 90) / 2.5));
  const qualifiedPlayers = teamPlayers.filter((p) => p.minutesPlayed >= minMinsThreshold);
  const pool = qualifiedPlayers.length >= 4 ? qualifiedPlayers : teamPlayers;

  const topThreats = [...pool]
    .map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      shortName: p.shortName,
      position: p.primaryPosition,
      minutesPlayed: p.minutesPlayed,
      matchesPlayed: p.matchesPlayed,
      roleType: "threat" as const,
      primaryStatLabel: "npxG / 90",
      primaryStatCode: "non_pen_xg_p90",
      primaryStatValue: p.nonPenXgPer90,
      secondaryStatLabel: "Shots / 90",
      secondaryStatValue: p.shotsPer90,
      compositeScore: num(p.nonPenXgPer90 * 3 + p.shotsPer90 * 0.4, 2),
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 4);

  const topCreators = [...pool]
    .map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      shortName: p.shortName,
      position: p.primaryPosition,
      minutesPlayed: p.minutesPlayed,
      matchesPlayed: p.matchesPlayed,
      roleType: "creator" as const,
      primaryStatLabel: "Key Passes / 90",
      primaryStatCode: "key_passes_p90",
      primaryStatValue: p.keyPassesPer90,
      secondaryStatLabel: "xA / 90",
      secondaryStatValue: p.expectedAssistsPer90 ?? 0,
      compositeScore: num(p.keyPassesPer90 + (p.expectedAssistsPer90 ?? 0) * 2.5, 2),
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 4);

  const card: TeamStyleProfileCardData = {
    cardType: "team_style_profile",
    teamId: targetTeamId,
    teamName: allSit.teamName,
    teamColor: allSit.teamColor,
    leagueName: resolved.tournamentName,
    season: activeSeasonKey,
    recentForm: formChars.length > 0 ? formChars.join("-") : "W-D-W-L-W",
    dominantFormations,
    styleArchetypes: styleArchetypes.slice(0, 5),
    strengths,
    weaknesses,
    topThreats,
    topCreators,
    situations: targetSits.map((s) => ({
      situation: s.situation,
      matches: s.matches,
      goalsForPerMatch: s.goalsForPerMatch,
      goalsAgainstPerMatch: s.goalsAgainstPerMatch,
      values: s.displayValues,
      percentiles: s.percentiles,
    })),
  };

  return { found: true, card };
}

// ============================================================================
// VISUAL STUDIO BUILDERS (Interactive No-Code Templates: Player & Team Level)
// ============================================================================

function matchesPosGroup(p: RawAggregatedPlayer, posGroup?: string): boolean {
  if (!posGroup || posGroup === "ALL") return true;
  const g = posGroup.toUpperCase();
  if (g === "GK") return p.primaryPosition === "GK" || p.bioPosition === "G";
  if (g === "CB") return p.primaryPosition === "CB";
  if (g === "FB") return ["FB", "WB", "LB", "RB"].includes(p.primaryPosition);
  if (g === "CM" || g === "DM/CM") return ["DM", "CM"].includes(p.primaryPosition);
  if (g === "W/AM") return ["W", "LW", "RW", "AM", "WAM"].includes(p.primaryPosition);
  if (g === "ST" || g === "CF") return ["F", "ST", "CF"].includes(p.primaryPosition);
  return p.primaryPosition === g || p.bioPosition === g;
}

export async function getStudioOptions(leagueInput?: string, seasonInput?: string) {
  const resolved = resolveLeagueAndSeason(leagueInput, seasonInput ?? "26/27");
  const [players, styles] = await Promise.all([
    fetchSeasonPlayerCohort(resolved.seasonKey, resolved.tournamentId),
    fetchLeagueTeamStyles(resolved.tournamentId, resolved.seasonKey),
  ]);

  const teams = styles
    .filter((s) => s.situation === "All")
    .sort((a, b) => a.teamName.localeCompare(b.teamName))
    .map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      teamShortName: t.teamShortName,
      matches: t.matches,
    }));

  const playerOptions = [...players]
    .sort((a, b) => b.minutesPlayed - a.minutesPlayed)
    .map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      shortName: p.shortName,
      teamName: p.teamName,
      position: p.primaryPosition,
      minutesPlayed: p.minutesPlayed,
      isU23: p.isU23,
      isLocal: p.isLocal,
    }));

  return {
    selectedLeague: {
      id: resolved.tournamentId,
      name: resolved.tournamentName,
      season: resolved.seasonKey,
    },
    leagues: Object.values(TOURNAMENTS).map((t) => ({
      id: t.id,
      name: t.name,
      seasons: Object.keys(t.seasons),
    })),
    teams,
    players: playerOptions,
    playerMetrics: PLAYER_METRIC_CATALOG,
    teamMetrics: TEAM_METRIC_CATALOG,
  };
}

export async function buildStudioPlayerCard(options: {
  playerId?: number;
  playerName?: string;
  league?: string;
  season?: string;
  compareSeason?: string;
  positionGroup?: string;
  minMinutes?: number;
  metricKeys?: string[];
}): Promise<PlayerScoutingCardData | null> {
  const curr = resolveLeagueAndSeason(options.league, options.season ?? "26/27");
  const currCohort = await fetchSeasonPlayerCohort(curr.seasonKey, curr.tournamentId);

  const target = options.playerId
    ? currCohort.find((p) => p.playerId === options.playerId)
    : currCohort.find((p) =>
        p.playerName.toLowerCase().includes((options.playerName ?? "").toLowerCase()),
      );
  if (!target) return null;

  let prevTarget: RawAggregatedPlayer | undefined;
  let prevSeasonLabel: string | undefined;
  if (options.compareSeason && options.compareSeason !== "none" && options.compareSeason !== curr.seasonKey) {
    const prev = resolveLeagueAndSeason(curr.tournamentId, options.compareSeason);
    const prevCohort = await fetchSeasonPlayerCohort(prev.seasonKey, prev.tournamentId);
    prevTarget = prevCohort.find((p) => p.playerId === target.playerId);
    if (prevTarget && prevTarget.minutesPlayed >= 180) {
      prevSeasonLabel = prev.seasonKey;
    } else {
      prevTarget = undefined;
    }
  }

  const defaultMin = options.minMinutes ?? (curr.isOngoing ? 180 : 450);
  const posFilter = options.positionGroup && options.positionGroup !== "AUTO" ? options.positionGroup : target.primaryPosition;
  const peers = currCohort.filter((p) => p.minutesPlayed >= defaultMin && matchesPosGroup(p, posFilter));
  const safePeers = peers.length >= 5 ? peers : currCohort.filter((p) => p.minutesPlayed >= defaultMin);

  const selectedDefs =
    options.metricKeys && options.metricKeys.length > 0
      ? PLAYER_METRIC_CATALOG.filter((m) => options.metricKeys!.includes(m.key))
      : PLAYER_METRIC_CATALOG.slice(0, 12);

  const metrics = selectedDefs.map((m) => {
    const val = Number((target as any)[m.key] ?? 0);
    const peerVals = safePeers.map((p) => Number((p as any)[m.key] ?? 0));
    const pct = pctRank(val, peerVals);
    const prevVal = prevTarget ? Number((prevTarget as any)[m.key] ?? 0) : undefined;
    const prevPct = prevVal !== undefined ? pctRank(prevVal, peerVals) : undefined;
    return {
      key: m.key,
      tacticalLabel: m.tacticalLabel,
      technicalCode: m.technicalCode,
      group: m.group,
      valuePer90: num(val, 2),
      prevValuePer90: prevVal !== undefined ? num(prevVal, 2) : undefined,
      percentile: pct,
      prevPercentile: prevPct,
      unit: m.unit,
    };
  });

  const top3 = [...metrics].sort((a, b) => b.percentile - a.percentile).slice(0, 3);

  return {
    cardType: "player_scouting",
    playerId: target.playerId,
    playerName: target.playerName,
    shortName: target.shortName,
    teamName: target.teamName,
    teamColor: target.teamColor,
    leagueName: curr.tournamentName,
    age: target.age,
    isU23: target.isU23,
    nationality: target.nationality,
    isLocal: target.isLocal,
    primaryPosition: target.primaryPosition,
    positionSharePct: target.positionSharePct,
    season: curr.seasonKey,
    prevSeason: prevSeasonLabel,
    minutesPlayed: target.minutesPlayed,
    prevMinutesPlayed: prevTarget?.minutesPlayed,
    matchesPlayed: target.matchesPlayed,
    earlySeasonSample: curr.isOngoing && target.minutesPlayed >= 180 && target.minutesPlayed < 450,
    lowSampleWarning: target.minutesPlayed < 180,
    peerCount: safePeers.length,
    metrics,
    tacticalSummary: `${target.playerName} (${target.teamName}) stands out in ${top3.map((m) => `${m.tacticalLabel} (P${m.percentile})`).join(", ")}.`,
  };
}

export async function buildStudioPlayerScatter(options: {
  league?: string;
  season?: string;
  xMetric: string;
  yMetric: string;
  positionGroup?: string;
  ageGroup?: "All" | "U23" | "Senior";
  nationality?: "All" | "Local" | "Foreign";
  minMinutes?: number;
  focalPlayerId?: number;
  limit?: number;
}): Promise<PeerComparisonCardData> {
  const curr = resolveLeagueAndSeason(options.league, options.season ?? "26/27");
  const cohort = await fetchSeasonPlayerCohort(curr.seasonKey, curr.tournamentId);
  const minMins = options.minMinutes ?? (curr.isOngoing ? 180 : 450);

  const xDef = PLAYER_METRIC_CATALOG.find((m) => m.key === options.xMetric) ?? PLAYER_METRIC_CATALOG[11]!;
  const yDef = PLAYER_METRIC_CATALOG.find((m) => m.key === options.yMetric) ?? PLAYER_METRIC_CATALOG[18]!;

  const filtered = cohort.filter((p) => {
    if (p.minutesPlayed < minMins) return false;
    if (!matchesPosGroup(p, options.positionGroup)) return false;
    if (options.ageGroup === "U23" && !p.isU23) return false;
    if (options.ageGroup === "Senior" && p.isU23) return false;
    if (options.nationality === "Local" && !p.isLocal) return false;
    if (options.nationality === "Foreign" && p.isLocal) return false;
    return true;
  });

  const sortedX = filtered.map((p) => Number((p as any)[xDef.key] ?? 0)).sort((a, b) => a - b);
  const sortedY = filtered.map((p) => Number((p as any)[yDef.key] ?? 0)).sort((a, b) => a - b);

  // Rank by combined normalized prominence while always keeping focalPlayerId included
  const ranked = [...filtered].sort((a, b) => {
    if (a.playerId === options.focalPlayerId) return -1;
    if (b.playerId === options.focalPlayerId) return 1;
    return (
      Number((b as any)[xDef.key] ?? 0) +
      Number((b as any)[yDef.key] ?? 0) -
      (Number((a as any)[xDef.key] ?? 0) + Number((a as any)[yDef.key] ?? 0))
    );
  });

  const topPoints = ranked.slice(0, options.limit ?? 24);

  return {
    cardType: "peer_comparison",
    mode: "scatter_quadrant",
    title: `${curr.tournamentName} ${curr.seasonKey} — ${xDef.tacticalLabel} vs ${yDef.tacticalLabel}`,
    subtitle: `Position: ${options.positionGroup || "ALL"} • Age: ${options.ageGroup || "All"} • Quota: ${options.nationality || "All"} • >=${minMins} mins (N=${filtered.length})`,
    season: curr.seasonKey,
    positionGroup: options.positionGroup || "ALL",
    xAxisLabel: xDef.tacticalLabel,
    xAxisCode: xDef.technicalCode,
    yAxisLabel: yDef.tacticalLabel,
    yAxisCode: yDef.technicalCode,
    xMedian: num(sortedX[Math.floor(sortedX.length / 2)] ?? 0, 2),
    yMedian: num(sortedY[Math.floor(sortedY.length / 2)] ?? 0, 2),
    players: topPoints.map((p, idx) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      shortName: p.shortName,
      teamName: p.teamName,
      age: p.age,
      isU23: p.isU23,
      nationality: p.nationality,
      isLocal: p.isLocal,
      position: p.primaryPosition,
      minutesPlayed: p.minutesPlayed,
      isFocal: options.focalPlayerId ? p.playerId === options.focalPlayerId : idx === 0,
      xValue: num((p as any)[xDef.key] ?? 0, 2),
      yValue: num((p as any)[yDef.key] ?? 0, 2),
      metrics: {
        [xDef.technicalCode]: num((p as any)[xDef.key] ?? 0, 2),
        [yDef.technicalCode]: num((p as any)[yDef.key] ?? 0, 2),
        "Acc. Long Balls / 90": p.accurateLongBallsPer90,
        "Key Passes / 90": p.keyPassesPer90,
        "PAdj Total Defense": p.padjTotalDefense,
      },
    })),
  };
}

export async function buildStudioPlayerRanking(options: {
  league?: string;
  season?: string;
  metricKey: string;
  positionGroup?: string;
  ageGroup?: "All" | "U23" | "Senior";
  nationality?: "All" | "Local" | "Foreign";
  minMinutes?: number;
  limit?: number;
  ascending?: boolean;
}): Promise<PlayerRankingCardData> {
  const curr = resolveLeagueAndSeason(options.league, options.season ?? "26/27");
  const cohort = await fetchSeasonPlayerCohort(curr.seasonKey, curr.tournamentId);
  const minMins = options.minMinutes ?? (curr.isOngoing ? 180 : 450);
  const mDef = PLAYER_METRIC_CATALOG.find((m) => m.key === options.metricKey) ?? PLAYER_METRIC_CATALOG[2]!;

  const filtered = cohort.filter((p) => {
    if (p.minutesPlayed < minMins) return false;
    if (!matchesPosGroup(p, options.positionGroup)) return false;
    if (options.ageGroup === "U23" && !p.isU23) return false;
    if (options.ageGroup === "Senior" && p.isU23) return false;
    if (options.nationality === "Local" && !p.isLocal) return false;
    if (options.nationality === "Foreign" && p.isLocal) return false;
    return true;
  });

  const allVals = filtered.map((p) => Number((p as any)[mDef.key] ?? 0));
  const sorted = [...filtered].sort((a, b) => {
    const va = Number((a as any)[mDef.key] ?? 0);
    const vb = Number((b as any)[mDef.key] ?? 0);
    return options.ascending ? va - vb : vb - va;
  });

  const topRows = sorted.slice(0, options.limit ?? 15);

  return {
    cardType: "player_ranking",
    title: `${curr.tournamentName} ${curr.seasonKey} — Top ${topRows.length} by ${mDef.tacticalLabel}`,
    subtitle: `Position: ${options.positionGroup || "ALL"} • Age: ${options.ageGroup || "All"} • Quota: ${options.nationality || "All"} • >=${minMins} mins`,
    leagueName: curr.tournamentName,
    season: curr.seasonKey,
    metricKey: mDef.key,
    metricLabel: mDef.tacticalLabel,
    metricCode: mDef.technicalCode,
    rows: topRows.map((p, i) => {
      const val = num((p as any)[mDef.key] ?? 0, 2);
      return {
        rank: i + 1,
        playerId: p.playerId,
        playerName: p.playerName,
        shortName: p.shortName,
        teamName: p.teamName,
        position: p.primaryPosition,
        age: p.age,
        isU23: p.isU23,
        isLocal: p.isLocal,
        minutesPlayed: p.minutesPlayed,
        value: val,
        percentile: pctRank(val, allVals),
      };
    }),
  };
}

export async function buildStudioTeamScatter(options: {
  league?: string;
  season?: string;
  xMetricId: string;
  yMetricId: string;
  situation?: "All" | "Home" | "Away" | "Last 6";
  focalTeamId?: number;
}): Promise<TeamScatterCardData> {
  const curr = resolveLeagueAndSeason(options.league, options.season ?? "26/27");
  const allStyles = await fetchLeagueTeamStyles(curr.tournamentId, curr.seasonKey);
  const sit = options.situation ?? "All";
  const rows = allStyles.filter((s) => s.situation === sit);

  const xDef = TEAM_METRIC_CATALOG.find((m) => m.id === options.xMetricId) ?? TEAM_METRIC_CATALOG[1]!;
  const yDef = TEAM_METRIC_CATALOG.find((m) => m.id === options.yMetricId) ?? TEAM_METRIC_CATALOG[12]!;

  const xVals = rows.map((r) => r.percentiles[xDef.id] ?? 50).sort((a, b) => a - b);
  const yVals = rows.map((r) => r.percentiles[yDef.id] ?? 50).sort((a, b) => a - b);

  return {
    cardType: "team_scatter",
    title: `${curr.tournamentName} ${curr.seasonKey} (${sit}) — ${xDef.label} vs ${yDef.label}`,
    subtitle: `Club Tactical Matrix (Percentile 0–100) • X: ${xDef.technicalFormula} • Y: ${yDef.technicalFormula}`,
    leagueName: curr.tournamentName,
    season: curr.seasonKey,
    xMetricId: xDef.id,
    xLabel: xDef.label,
    xFormula: xDef.technicalFormula,
    yMetricId: yDef.id,
    yLabel: yDef.label,
    yFormula: yDef.technicalFormula,
    xMedian: xVals[Math.floor(xVals.length / 2)] ?? 50,
    yMedian: yVals[Math.floor(yVals.length / 2)] ?? 50,
    teams: rows.map((r, i) => ({
      teamId: r.teamId,
      teamName: r.teamName,
      teamShortName: r.teamShortName,
      teamColor: r.teamColor,
      matches: r.matches,
      isFocal: options.focalTeamId ? r.teamId === options.focalTeamId : i === 0,
      xValue: r.displayValues[xDef.id] ?? 0,
      xPercentile: r.percentiles[xDef.id] ?? 50,
      yValue: r.displayValues[yDef.id] ?? 0,
      yPercentile: r.percentiles[yDef.id] ?? 50,
    })),
  };
}
