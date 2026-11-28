import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Check,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { newSessionId, setPendingMessage } from "../lib/pending-message";
import {
  PeerComparisonCard,
  PlayerRankingCard,
  PlayerScoutingCard,
  TeamScatterCard,
  TeamStyleProfileCard,
} from "../components/reports/visual-cards";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type StudioLeague = {
  id: number;
  name: string;
  seasons: string[];
};

type StudioTeamOption = {
  teamId: number;
  teamName: string;
  teamShortName: string;
  matches: number;
};

type StudioPlayerOption = {
  playerId: number;
  playerName: string;
  shortName: string;
  teamName: string;
  position: string;
  minutesPlayed: number;
  isU23: boolean;
  isLocal: boolean;
};

type PlayerMetricDef = {
  key: string;
  tacticalLabel: string;
  technicalCode: string;
  group: string;
  groupLabel: string;
  unit?: string;
};

type TeamMetricDef = {
  id: string;
  label: string;
  technicalFormula: string;
  mainCategory: string;
  subCategory: string;
  description: string;
};

type StudioOptionsPayload = {
  selectedLeague: { id: number; name: string; season: string };
  leagues: StudioLeague[];
  teams: StudioTeamOption[];
  players: StudioPlayerOption[];
  playerMetrics: PlayerMetricDef[];
  teamMetrics: TeamMetricDef[];
};

type StudioLevel = "team" | "player";
type TemplateKey =
  | "team_style"
  | "team_scatter"
  | "player_card"
  | "player_scatter"
  | "player_ranking";

const PLAYER_METRIC_PRESETS: Record<string, { label: string; keys: string[] }> = {
  balanced: {
    label: "All-Round (10)",
    keys: [
      "nonPenXgPer90",
      "shotsPer90",
      "expectedAssistsPer90",
      "keyPassesPer90",
      "accuratePassesPer90",
      "accurateLongBallsPer90",
      "successfulDribblesPer90",
      "duelsWonPer90",
      "padjInterceptions",
      "padjTotalDefense",
    ],
  },
  attacking: {
    label: "Attacker / Creator",
    keys: [
      "goalsPer90",
      "shotsPer90",
      "nonPenXgPer90",
      "xgotPer90",
      "assistsPer90",
      "expectedAssistsPer90",
      "keyPassesPer90",
      "bigChancesCreatedPer90",
      "touchesPer90",
      "successfulDribblesPer90",
    ],
  },
  midfield: {
    label: "Midfield Progression",
    keys: [
      "accuratePassesPer90",
      "passAccuracyPct",
      "accurateLongBallsPer90",
      "accurateOppositionHalfPassesPer90",
      "keyPassesPer90",
      "expectedAssistsPer90",
      "touchesPer90",
      "successfulDribblesPer90",
      "padjInterceptions",
      "padjRecoveries",
    ],
  },
  defensive: {
    label: "Defender / Ball-Winner",
    keys: [
      "padjInterceptions",
      "padjTackles",
      "padjRecoveries",
      "padjTotalDefense",
      "duelsWonPer90",
      "aerialWonPer90",
      "accuratePassesPer90",
      "passAccuracyPct",
      "accurateLongBallsPer90",
    ],
  },
};

export const Route = createFileRoute("/studio")({
  component: VisualStudioPage,
});

function VisualStudioPage() {
  const navigate = useNavigate();

  // Global League & Season
  const [leagueName, setLeagueName] = useState("Indonesia Super League");
  const [season, setSeason] = useState("26/27");
  const [level, setLevel] = useState<StudioLevel>("team");
  const [template, setTemplate] = useState<TemplateKey>("team_style");

  // Options State
  const [options, setOptions] = useState<StudioOptionsPayload | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Team Level Controls
  const [selectedTeamName, setSelectedTeamName] = useState("Persib Bandung");
  const [teamXMetric, setTeamXMetric] = useState("possession");
  const [teamYMetric, setTeamYMetric] = useState("open_play_attack");
  const [teamSituation, setTeamSituation] = useState<"All" | "Home" | "Away" | "Last 6">("All");
  const [focalTeamId, setFocalTeamId] = useState<number | undefined>(undefined);

  // Player Level Controls
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | undefined>(undefined);
  const [compareSeason, setCompareSeason] = useState("25/26");
  const [positionGroup, setPositionGroup] = useState("AUTO");
  const [scatterPosition, setScatterPosition] = useState("CM");
  const [ageGroup, setAgeGroup] = useState<"All" | "U23" | "Senior">("All");
  const [nationality, setNationality] = useState<"All" | "Local" | "Foreign">("All");
  const [minMinutes, setMinMinutes] = useState<number>(180);
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<string[]>(
    PLAYER_METRIC_PRESETS.balanced!.keys,
  );
  const [playerXMetric, setPlayerXMetric] = useState("accurateLongBallsPer90");
  const [playerYMetric, setPlayerYMetric] = useState("padjInterceptions");
  const [rankingMetricKey, setRankingMetricKey] = useState("nonPenXgPer90");
  const [rankingLimit, setRankingLimit] = useState<number>(15);

  // Rendered Card Output
  const [activeCard, setActiveCard] = useState<any | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // Switch default template when switching Team vs Player level
  function switchLevel(next: StudioLevel) {
    setLevel(next);
    if (next === "team" && !template.startsWith("team_")) {
      setTemplate("team_style");
    } else if (next === "player" && !template.startsWith("player_")) {
      setTemplate("player_card");
    }
  }

  // Fetch League/Season Cohort Options
  useEffect(() => {
    let cancelled = false;
    async function loadOpts() {
      setLoadingOptions(true);
      try {
        const res = await fetch(
          `${baseUrl}/api/studio/options?league=${encodeURIComponent(leagueName)}&season=${encodeURIComponent(season)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as StudioOptionsPayload;
        if (cancelled) return;
        setOptions(data);

        // Ensure valid default team & player for newly selected league/season
        if (data.teams.length > 0) {
          const exists = data.teams.some((t) => t.teamName === selectedTeamName);
          if (!exists) {
            setSelectedTeamName(data.teams[0]!.teamName);
            setFocalTeamId(data.teams[0]!.teamId);
          } else if (!focalTeamId) {
            const matched = data.teams.find((t) => t.teamName === selectedTeamName);
            setFocalTeamId(matched?.teamId);
          }
        }
        if (data.players.length > 0) {
          const pExists = data.players.some((p) => p.playerId === selectedPlayerId);
          if (!pExists) {
            setSelectedPlayerId(data.players[0]!.playerId);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }
    void loadOpts();
    return () => {
      cancelled = true;
    };
  }, [leagueName, season]);

  // Adjust default minMinutes when season changes
  useEffect(() => {
    setMinMinutes(season === "26/27" ? 180 : 450);
  }, [season]);

  // Fetch Visual Card whenever template or active parameters change
  useEffect(() => {
    if (loadingOptions) return;
    let cancelled = false;

    async function fetchVisualCard() {
      setLoadingCard(true);
      setCardError(null);
      try {
        let url = "";
        if (template === "team_style") {
          const params = new URLSearchParams({
            league: leagueName,
            season,
            teamName: selectedTeamName,
          });
          url = `${baseUrl}/api/studio/team-style?${params.toString()}`;
        } else if (template === "team_scatter") {
          const params = new URLSearchParams({
            league: leagueName,
            season,
            xMetricId: teamXMetric,
            yMetricId: teamYMetric,
            situation: teamSituation,
          });
          if (focalTeamId) params.set("focalTeamId", String(focalTeamId));
          url = `${baseUrl}/api/studio/team-scatter?${params.toString()}`;
        } else if (template === "player_card") {
          if (!selectedPlayerId) {
            setLoadingCard(false);
            return;
          }
          const params = new URLSearchParams({
            league: leagueName,
            season,
            playerId: String(selectedPlayerId),
            compareSeason,
            positionGroup,
            minMinutes: String(minMinutes),
            metrics: selectedMetricKeys.join(","),
          });
          url = `${baseUrl}/api/studio/player-card?${params.toString()}`;
        } else if (template === "player_scatter") {
          const params = new URLSearchParams({
            league: leagueName,
            season,
            xMetric: playerXMetric,
            yMetric: playerYMetric,
            positionGroup: scatterPosition,
            ageGroup,
            nationality,
            minMinutes: String(minMinutes),
          });
          if (selectedPlayerId) params.set("focalPlayerId", String(selectedPlayerId));
          url = `${baseUrl}/api/studio/player-scatter?${params.toString()}`;
        } else if (template === "player_ranking") {
          const params = new URLSearchParams({
            league: leagueName,
            season,
            metricKey: rankingMetricKey,
            positionGroup: scatterPosition,
            ageGroup,
            nationality,
            minMinutes: String(minMinutes),
            limit: String(rankingLimit),
          });
          url = `${baseUrl}/api/studio/player-ranking?${params.toString()}`;
        }

        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || json.error) {
          setCardError(json.error || "Gagal memuat visualisasi untuk filter ini.");
          setActiveCard(null);
        } else {
          setActiveCard(json.card);
        }
      } catch {
        if (!cancelled) setCardError("Tidak dapat terhubung ke server API Halfspace.");
      } finally {
        if (!cancelled) setLoadingCard(false);
      }
    }

    void fetchVisualCard();
    return () => {
      cancelled = true;
    };
  }, [
    loadingOptions,
    template,
    leagueName,
    season,
    selectedTeamName,
    teamXMetric,
    teamYMetric,
    teamSituation,
    focalTeamId,
    selectedPlayerId,
    compareSeason,
    positionGroup,
    scatterPosition,
    ageGroup,
    nationality,
    minMinutes,
    selectedMetricKeys,
    playerXMetric,
    playerYMetric,
    rankingMetricKey,
    rankingLimit,
  ]);

  const currentLeagueObj = useMemo(
    () => options?.leagues.find((l) => l.name === leagueName) ?? options?.leagues[0],
    [options, leagueName],
  );

  const filteredPlayers = useMemo(() => {
    const all = options?.players ?? [];
    if (!playerSearch.trim()) return all.slice(0, 120);
    const q = playerSearch.toLowerCase().trim();
    return all
      .filter(
        (p) =>
          p.playerName.toLowerCase().includes(q) ||
          p.teamName.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q),
      )
      .slice(0, 120);
  }, [options, playerSearch]);

  const groupedPlayerMetrics = useMemo(() => {
    const groups = new Map<string, PlayerMetricDef[]>();
    for (const m of options?.playerMetrics ?? []) {
      const list = groups.get(m.groupLabel) ?? [];
      list.push(m);
      groups.set(m.groupLabel, list);
    }
    return Array.from(groups.entries());
  }, [options]);

  const groupedTeamMetrics = useMemo(() => {
    const groups = new Map<string, TeamMetricDef[]>();
    for (const m of options?.teamMetrics ?? []) {
      const label = `${m.mainCategory} · ${m.subCategory}`;
      const list = groups.get(label) ?? [];
      list.push(m);
      groups.set(label, list);
    }
    return Array.from(groups.entries());
  }, [options]);

  function togglePlayerMetric(key: string) {
    setSelectedMetricKeys((prev) => {
      if (prev.includes(key)) {
        return prev.length > 2 ? prev.filter((k) => k !== key) : prev;
      }
      return [...prev, key];
    });
  }

  function handoffToAiChat() {
    let brief = "";
    if (template === "team_style") {
      brief = `Bedah secara mendalam playing style, kekuatan (strengths), celah kelemahan (weaknesses), formasi dominan, dan key players dari ${selectedTeamName} di ${leagueName} musim ${season}.`;
    } else if (template === "team_scatter") {
      brief = `Analisis perbandingan klub di ${leagueName} musim ${season} (${teamSituation}) berdasarkan matriks ${teamXMetric} vs ${teamYMetric}, dan jelaskan posisi taktik ${selectedTeamName}.`;
    } else if (template === "player_card") {
      const p = options?.players.find((x) => x.playerId === selectedPlayerId);
      brief = `Buatkan analisis taktik mendalam dan laporan scouting untuk ${p?.playerName ?? "pemain ini"} (${p?.teamName ?? leagueName}) di musim ${season}${compareSeason !== "none" ? ` dibandingkan musim ${compareSeason}` : ""}.`;
    } else if (template === "player_scatter") {
      brief = `Analisis kuadran pemain posisi ${scatterPosition} (${ageGroup}, ${nationality}) di ${leagueName} musim ${season} berdasarkan metrik ${playerXMetric} vs ${playerYMetric}. Siapa outlier terbaiknya?`;
    } else {
      brief = `Analisis daftar pemain terbaik (leaderboard) di ${leagueName} musim ${season} untuk metrik ${rankingMetricKey} pada posisi ${scatterPosition}.`;
    }
    const id = newSessionId();
    setPendingMessage(id, brief);
    void navigate({ to: "/s/$id", params: { id } });
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0F172A] overflow-hidden">
      {/* Top Studio Header & Competition Selector */}
      <header className="px-6 py-3 border-b border-[#334155] bg-[#0B1120] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#38BDF8]" />
            <span className="font-editorial text-lg font-bold text-[#F8FAFC]">
              Visual Studio Lab
            </span>
          </div>
          <span className="text-[#334155]">|</span>

          {/* League Selector */}
          <select
            value={leagueName}
            onChange={(e) => {
              const nextLeague = e.target.value;
              setLeagueName(nextLeague);
              const found = options?.leagues.find((l) => l.name === nextLeague);
              if (found && !found.seasons.includes(season)) {
                setSeason(found.seasons[found.seasons.length - 1] ?? "25/26");
              }
            }}
            className="bg-[#0F172A] border border-[#334155] text-xs font-semibold text-[#F8FAFC] px-2.5 py-1.5 focus:outline-none focus:border-[#38BDF8]"
          >
            {(options?.leagues ?? [{ id: 1015, name: "Indonesia Super League", seasons: ["26/27", "25/26", "24/25"] }]).map(
              (l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ),
            )}
          </select>

          {/* Season Selector */}
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="bg-[#0F172A] border border-[#334155] font-tech text-xs text-[#6EE7B7] px-2.5 py-1.5 focus:outline-none focus:border-[#6EE7B7]"
          >
            {(currentLeagueObj?.seasons ?? ["26/27", "25/26", "24/25"]).map((s) => (
              <option key={s} value={s}>
                Season {s}
              </option>
            ))}
          </select>

          {/* Level Switcher */}
          <div className="inline-flex border border-[#334155] bg-[#0F172A] p-0.5 font-tech text-[11px]">
            <button
              type="button"
              onClick={() => switchLevel("team")}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                level === "team" ? "bg-[#6EE7B7] text-[#0F172A] font-bold" : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              TEAM LEVEL
            </button>
            <button
              type="button"
              onClick={() => switchLevel("player")}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                level === "player" ? "bg-[#38BDF8] text-[#0F172A] font-bold" : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              PLAYER LEVEL
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handoffToAiChat}
          className="inline-flex items-center gap-1.5 border border-[#6EE7B7] bg-[#6EE7B7]/10 hover:bg-[#6EE7B7] text-[#6EE7B7] hover:text-[#0F172A] px-3 py-1.5 font-tech text-[11px] font-bold transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Analisis Grafik Ini dengan AI &rarr;
        </button>
      </header>

      {/* Template Picker Ribbon */}
      <div className="px-6 py-2 border-b border-[#334155] bg-[#0B1120]/60 flex flex-wrap items-center gap-2 shrink-0">
        <span className="font-tech text-[10px] uppercase tracking-widest text-[#64748B] mr-2">
          Visual Template:
        </span>
        {level === "team" ? (
          <>
            <button
              type="button"
              onClick={() => setTemplate("team_style")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold transition-colors cursor-pointer ${
                template === "team_style"
                  ? "border-[#6EE7B7] bg-[#6EE7B7]/15 text-[#6EE7B7]"
                  : "border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              24-Metric Team Style, Strengths &amp; Key Players
            </button>
            <button
              type="button"
              onClick={() => setTemplate("team_scatter")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold transition-colors cursor-pointer ${
                template === "team_scatter"
                  ? "border-[#6EE7B7] bg-[#6EE7B7]/15 text-[#6EE7B7]"
                  : "border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Club 2D Tactical Matrix (X/Y Scatter)
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setTemplate("player_card")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold transition-colors cursor-pointer ${
                template === "player_card"
                  ? "border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8]"
                  : "border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Player Percentile &amp; 2-Season Evolution Card
            </button>
            <button
              type="button"
              onClick={() => setTemplate("player_scatter")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold transition-colors cursor-pointer ${
                template === "player_scatter"
                  ? "border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8]"
                  : "border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Player 2D Scouting Quadrant (X/Y)
            </button>
            <button
              type="button"
              onClick={() => setTemplate("player_ranking")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold transition-colors cursor-pointer ${
                template === "player_ranking"
                  ? "border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8]"
                  : "border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Custom Metric Leaderboard
            </button>
          </>
        )}
      </div>

      {/* Main Studio Workspace: Left Parameter Inspector (4 cols) + Right Live Canvas (8 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Parameter Controls */}
        <div className="lg:col-span-4 border-r border-[#334155] bg-[#0B1120]/70 p-5 overflow-y-auto space-y-5">
          {loadingOptions ? (
            <div className="py-12 flex items-center justify-center gap-2 font-tech text-xs text-[#38BDF8]">
              <Loader2 className="w-4 h-4 animate-spin" />
              LOADING COHORT...
            </div>
          ) : (
            <>
              {/* TEAM STYLE CONTROLS */}
              {template === "team_style" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block font-tech text-[10px] uppercase tracking-widest text-[#6EE7B7]">
                      Pilih Klub ({options?.teams.length ?? 0} Teams)
                    </label>
                    <select
                      value={selectedTeamName}
                      onChange={(e) => {
                        setSelectedTeamName(e.target.value);
                        const t = options?.teams.find((x) => x.teamName === e.target.value);
                        if (t) setFocalTeamId(t.teamId);
                      }}
                      className="w-full bg-[#0F172A] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#6EE7B7]"
                    >
                      {(options?.teams ?? []).map((t) => (
                        <option key={t.teamId} value={t.teamName}>
                          {t.teamName} ({t.matches} matches)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-[#334155] pt-4 space-y-2 text-xs text-[#94A3B8]">
                    <div className="font-tech text-[10px] uppercase tracking-wider text-[#38BDF8]">
                      Apa yang dihitung di template ini?
                    </div>
                    <p className="leading-relaxed">
                      Menghitung <strong>24 metrik taktik &amp; performa</strong> (In Possession, Out of Possession, Attack, Defence) pada situasi <code>All</code>, <code>Home</code>, <code>Away</code>, dan <code>Last 6</code>, lengkap dengan deteksi otomatis <strong>Strengths &amp; Weaknesses</strong> serta <strong>Top Threats &amp; Creators</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* TEAM SCATTER CONTROLS */}
              {template === "team_scatter" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block font-tech text-[10px] uppercase tracking-widest text-[#6EE7B7]">
                      X-Axis Team Metric
                    </label>
                    <select
                      value={teamXMetric}
                      onChange={(e) => setTeamXMetric(e.target.value)}
                      className="w-full bg-[#0F172A] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#6EE7B7]"
                    >
                      {groupedTeamMetrics.map(([group, list]) => (
                        <optgroup key={group} label={group}>
                          {list.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} ({m.technicalFormula})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-tech text-[10px] uppercase tracking-widest text-[#38BDF8]">
                      Y-Axis Team Metric
                    </label>
                    <select
                      value={teamYMetric}
                      onChange={(e) => setTeamYMetric(e.target.value)}
                      className="w-full bg-[#0F172A] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                    >
                      {groupedTeamMetrics.map(([group, list]) => (
                        <optgroup key={group} label={group}>
                          {list.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} ({m.technicalFormula})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block font-tech text-[10px] uppercase text-[#94A3B8]">
                        Match Situation
                      </label>
                      <select
                        value={teamSituation}
                        onChange={(e) => setTeamSituation(e.target.value as any)}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 text-xs text-[#F8FAFC]"
                      >
                        <option value="All">All Matches</option>
                        <option value="Home">Home Only</option>
                        <option value="Away">Away Only</option>
                        <option value="Last 6">Last 6 Form</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-tech text-[10px] uppercase text-[#94A3B8]">
                        Highlight Club
                      </label>
                      <select
                        value={focalTeamId ?? ""}
                        onChange={(e) => {
                          const tid = e.target.value ? Number(e.target.value) : undefined;
                          setFocalTeamId(tid);
                          const t = options?.teams.find((x) => x.teamId === tid);
                          if (t) setSelectedTeamName(t.teamName);
                        }}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 text-xs text-[#F8FAFC]"
                      >
                        {(options?.teams ?? []).map((t) => (
                          <option key={t.teamId} value={t.teamId}>
                            {t.teamShortName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="pt-2 border-t border-[#334155] space-y-1.5">
                    <div className="font-tech text-[10px] uppercase text-[#64748B]">Quick Tactical Pairs</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Possession vs Open Play Attack", x: "possession", y: "open_play_attack" },
                        { label: "Field Tilt vs Open Play Defence", x: "field_tilt_3rd_passes", y: "open_play_defence" },
                        { label: "Forward Press vs High Line", x: "forward_press_w_am_f", y: "high_line" },
                        { label: "Deep Build-Up vs Press Resistance", x: "deep_buildup_g", y: "press_resistance" },
                      ].map((pair) => (
                        <button
                          key={pair.label}
                          type="button"
                          onClick={() => {
                            setTeamXMetric(pair.x);
                            setTeamYMetric(pair.y);
                          }}
                          className="font-tech text-[10px] px-2 py-1 border border-[#334155] bg-[#0F172A] hover:border-[#6EE7B7] text-[#CBD5E1] cursor-pointer"
                        >
                          {pair.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PLAYER CARD CONTROLS */}
              {template === "player_card" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block font-tech text-[10px] uppercase tracking-widest text-[#38BDF8]">
                      Cari &amp; Pilih Pemain
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        placeholder="Ketik nama pemain atau klub..."
                        className="w-full bg-[#0F172A] border border-[#334155] pl-8 pr-3 py-1.5 text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#38BDF8]"
                      />
                    </div>
                    <select
                      value={selectedPlayerId ?? ""}
                      onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                      className="w-full bg-[#0F172A] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                    >
                      {filteredPlayers.map((p) => (
                        <option key={p.playerId} value={p.playerId}>
                          {p.playerName} — {p.teamName} ({p.position}, {p.minutesPlayed}m)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="block font-tech text-[9px] uppercase text-[#94A3B8]">Peer Group</label>
                      <select
                        value={positionGroup}
                        onChange={(e) => setPositionGroup(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2 py-1.5 text-xs text-[#F8FAFC]"
                      >
                        <option value="AUTO">Auto Role</option>
                        <option value="CB">CB</option>
                        <option value="FB">FB / WB</option>
                        <option value="CM">DM / CM</option>
                        <option value="W/AM">W / AM</option>
                        <option value="ST">ST / CF</option>
                        <option value="GK">GK</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-tech text-[9px] uppercase text-[#94A3B8]">Compare vs</label>
                      <select
                        value={compareSeason}
                        onChange={(e) => setCompareSeason(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2 py-1.5 text-xs text-[#F8FAFC]"
                      >
                        <option value="none">Single Season</option>
                        {(currentLeagueObj?.seasons ?? ["25/26", "24/25"])
                          .filter((s) => s !== season)
                          .map((s) => (
                            <option key={s} value={s}>
                              vs {s}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-tech text-[9px] uppercase text-[#94A3B8]">Min Mins</label>
                      <select
                        value={minMinutes}
                        onChange={(e) => setMinMinutes(Number(e.target.value))}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2 py-1.5 font-tech text-xs text-[#F8FAFC]"
                      >
                        <option value={90}>&ge;90m</option>
                        <option value={180}>&ge;180m</option>
                        <option value={450}>&ge;450m</option>
                        <option value={900}>&ge;900m</option>
                      </select>
                    </div>
                  </div>

                  {/* Metric Picker with Role Presets */}
                  <div className="pt-3 border-t border-[#334155] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-tech text-[10px] uppercase tracking-wider text-[#6EE7B7]">
                        Pilih Metrik ({selectedMetricKeys.length} aktif)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMetricKeys((options?.playerMetrics ?? []).map((m) => m.key))
                        }
                        className="font-tech text-[10px] text-[#38BDF8] hover:underline cursor-pointer"
                      >
                        Pilih Semua (22)
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(PLAYER_METRIC_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedMetricKeys(preset.keys)}
                          className="font-tech text-[10px] px-2 py-0.5 border border-[#334155] bg-[#0F172A] hover:border-[#6EE7B7] text-[#CBD5E1] cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {groupedPlayerMetrics.map(([groupName, metrics]) => (
                        <div key={groupName} className="space-y-1">
                          <div className="font-tech text-[9px] uppercase tracking-wider text-[#64748B]">
                            {groupName}
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {metrics.map((m) => {
                              const checked = selectedMetricKeys.includes(m.key);
                              return (
                                <button
                                  key={m.key}
                                  type="button"
                                  onClick={() => togglePlayerMetric(m.key)}
                                  className={`flex items-center justify-between px-2 py-1 border text-left text-[11px] transition-colors cursor-pointer ${
                                    checked
                                      ? "border-[#6EE7B7]/50 bg-[#6EE7B7]/10 text-[#F8FAFC]"
                                      : "border-[#334155]/60 bg-[#0F172A] text-[#94A3B8]"
                                  }`}
                                >
                                  <span className="truncate">
                                    {m.tacticalLabel}{" "}
                                    <code className="font-tech text-[9px] text-[#64748B]">{m.technicalCode}</code>
                                  </span>
                                  {checked && <Check className="w-3 h-3 text-[#6EE7B7] shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PLAYER SCATTER & PLAYER RANKING SHARED + SPECIFIC CONTROLS */}
              {(template === "player_scatter" || template === "player_ranking") && (
                <div className="space-y-4">
                  {template === "player_scatter" ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="block font-tech text-[10px] uppercase tracking-widest text-[#6EE7B7]">
                          X-Axis Player Metric
                        </label>
                        <select
                          value={playerXMetric}
                          onChange={(e) => setPlayerXMetric(e.target.value)}
                          className="w-full bg-[#0F172A] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC]"
                        >
                          {groupedPlayerMetrics.map(([groupName, list]) => (
                            <optgroup key={groupName} label={groupName}>
                              {list.map((m) => (
                                <option key={m.key} value={m.key}>
                                  {m.tacticalLabel} ({m.technicalCode})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-tech text-[10px] uppercase tracking-widest text-[#38BDF8]">
                          Y-Axis Player Metric
                        </label>
                        <select
                          value={playerYMetric}
                          onChange={(e) => setPlayerYMetric(e.target.value)}
                          className="w-full bg-[#0F172A] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC]"
                        >
                          {groupedPlayerMetrics.map(([groupName, list]) => (
                            <optgroup key={groupName} label={groupName}>
                              {list.map((m) => (
                                <option key={m.key} value={m.key}>
                                  {m.tacticalLabel} ({m.technicalCode})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="block font-tech text-[10px] uppercase tracking-widest text-[#6EE7B7]">
                        Target Ranking Metric
                      </label>
                      <select
                        value={rankingMetricKey}
                        onChange={(e) => setRankingMetricKey(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC]"
                      >
                        {groupedPlayerMetrics.map(([groupName, list]) => (
                          <optgroup key={groupName} label={groupName}>
                            {list.map((m) => (
                              <option key={m.key} value={m.key}>
                                {m.tacticalLabel} ({m.technicalCode})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cohort Filters */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block font-tech text-[9px] uppercase text-[#94A3B8]">Position</label>
                      <select
                        value={scatterPosition}
                        onChange={(e) => setScatterPosition(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 text-xs text-[#F8FAFC]"
                      >
                        <option value="ALL">All Positions</option>
                        <option value="CB">Center Back (CB)</option>
                        <option value="FB">Fullback / Wingback</option>
                        <option value="CM">Midfielder (DM/CM)</option>
                        <option value="W/AM">Winger / Attacking Mid</option>
                        <option value="ST">Striker (ST/CF)</option>
                        <option value="GK">Goalkeeper (GK)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-tech text-[9px] uppercase text-[#94A3B8]">Age Band</label>
                      <select
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value as any)}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 text-xs text-[#F8FAFC]"
                      >
                        <option value="All">All Ages</option>
                        <option value="U23">U-23 Only (&le;23y)</option>
                        <option value="Senior">Senior (&gt;23y)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-tech text-[9px] uppercase text-[#94A3B8]">Quota / Origin</label>
                      <select
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value as any)}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 text-xs text-[#F8FAFC]"
                      >
                        <option value="All">All Players</option>
                        <option value="Local">Local (IDN)</option>
                        <option value="Foreign">Foreign</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-tech text-[9px] uppercase text-[#94A3B8]">Min Minutes</label>
                      <select
                        value={minMinutes}
                        onChange={(e) => setMinMinutes(Number(e.target.value))}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 font-tech text-xs text-[#F8FAFC]"
                      >
                        <option value={90}>&ge;90 mins</option>
                        <option value={180}>&ge;180 mins</option>
                        <option value={450}>&ge;450 mins</option>
                        <option value={900}>&ge;900 mins</option>
                      </select>
                    </div>
                  </div>

                  {template === "player_ranking" && (
                    <div className="space-y-1">
                      <label className="block font-tech text-[9px] uppercase text-[#94A3B8]">Leaderboard Rows</label>
                      <select
                        value={rankingLimit}
                        onChange={(e) => setRankingLimit(Number(e.target.value))}
                        className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 font-tech text-xs text-[#F8FAFC]"
                      >
                        <option value={10}>Top 10 Players</option>
                        <option value={15}>Top 15 Players</option>
                        <option value={20}>Top 20 Players</option>
                      </select>
                    </div>
                  )}

                  {template === "player_scatter" && (
                    <div className="pt-2 border-t border-[#334155] space-y-1.5">
                      <div className="font-tech text-[10px] uppercase text-[#64748B]">Quick Scouting Quadrants</div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "Progression vs PAdj Interceptions", x: "accurateLongBallsPer90", y: "padjInterceptions", pos: "CM" },
                          { label: "Goal Threat (npxG) vs Shot Volume", x: "shotsPer90", y: "nonPenXgPer90", pos: "ST" },
                          { label: "Chance Creation (KP) vs 1v1 Dribbles", x: "keyPassesPer90", y: "successfulDribblesPer90", pos: "W/AM" },
                          { label: "Aerial Duels vs PAdj Total Defense", x: "aerialWonPer90", y: "padjTotalDefense", pos: "CB" },
                        ].map((q) => (
                          <button
                            key={q.label}
                            type="button"
                            onClick={() => {
                              setPlayerXMetric(q.x);
                              setPlayerYMetric(q.y);
                              setScatterPosition(q.pos);
                            }}
                            className="font-tech text-[10px] px-2 py-1 border border-[#334155] bg-[#0F172A] hover:border-[#38BDF8] text-[#CBD5E1] cursor-pointer"
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Live Editorial Visual Canvas */}
        <div className="lg:col-span-8 p-6 overflow-y-auto bg-[#0F172A]">
          {loadingCard ? (
            <div className="h-96 border border-[#334155] bg-[#0B1120]/50 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-[#6EE7B7] animate-spin" />
              <div className="font-tech text-xs text-[#94A3B8]">
                COMPUTING PERCENTILES &amp; RENDERING EDITORIAL CARD...
              </div>
            </div>
          ) : cardError ? (
            <div className="border border-[#FF6350]/50 bg-[#FF6350]/10 p-6 text-xs text-[#FF6350] font-tech">
              {cardError}
            </div>
          ) : activeCard ? (
            <div className="max-w-5xl mx-auto">
              {activeCard.cardType === "team_style_profile" && <TeamStyleProfileCard card={activeCard} />}
              {activeCard.cardType === "team_scatter" && <TeamScatterCard card={activeCard} />}
              {activeCard.cardType === "player_scouting" && <PlayerScoutingCard card={activeCard} />}
              {activeCard.cardType === "peer_comparison" && <PeerComparisonCard card={activeCard} />}
              {activeCard.cardType === "player_ranking" && <PlayerRankingCard card={activeCard} />}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
