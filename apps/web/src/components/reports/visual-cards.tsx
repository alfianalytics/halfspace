import { useState } from "react";
import { Download, Eye, Layers, Sparkles } from "lucide-react";

/**
 * Pure SVG / Canvas PNG Exporter for Halfspace Visual Report Cards
 * Supports Dual Export Modes: `editorial_dark` (#090A0F) and `transparent_clean`.
 */
async function exportElementAsPng(elementId: string, filename: string, mode: "editorial_dark" | "transparent_clean") {
  const el = document.getElementById(elementId);
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const width = Math.max(760, Math.round(rect.width));
  const height = Math.max(460, Math.round(rect.height));

  const clone = el.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  if (mode === "transparent_clean") {
    clone.style.background = "transparent";
  } else {
    clone.style.background = "#090A0F";
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgData = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        ${serialized}
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(2, 2);
      if (mode === "editorial_dark") {
        ctx.fillStyle = "#090A0F";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `${filename}-${mode}.png`;
      a.click();
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function getPercentileColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500 text-emerald-300";
  if (pct >= 60) return "bg-sky-500 text-sky-300";
  if (pct >= 40) return "bg-amber-500 text-amber-300";
  return "bg-rose-500 text-rose-300";
}

// ============================================================================
// 1. PLAYER SCOUTING & TWO-SEASON EVOLUTION CARD
// ============================================================================
export function PlayerScoutingCard({ card }: { card: any }) {
  const [exportMode, setExportMode] = useState<"editorial_dark" | "transparent_clean">("editorial_dark");
  const cardDomId = `scouting-card-${card.playerId}-${card.season.replace("/", "")}`;

  return (
    <div className="my-4 space-y-2">
      {/* Toolbar: Export Mode Toggle + Download PNG */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="inline-flex items-center gap-1.5 text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">Visual Report Template · Player Scouting & Evolution</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            <button
              type="button"
              onClick={() => setExportMode("editorial_dark")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                exportMode === "editorial_dark" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Editorial Dark
            </button>
            <button
              type="button"
              onClick={() => setExportMode("transparent_clean")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                exportMode === "transparent_clean" ? "bg-emerald-600/30 text-emerald-300" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Transparent Clean
            </button>
          </div>
          <button
            type="button"
            onClick={() => void exportElementAsPng(cardDomId, `halfspace-${card.shortName}`, exportMode)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            Export PNG
          </button>
        </div>
      </div>

      {/* Card Canvas */}
      <div
        id={cardDomId}
        className={`rounded-2xl border p-5 transition-all ${
          exportMode === "editorial_dark"
            ? "bg-[#090A0F] border-zinc-800 shadow-2xl"
            : "bg-transparent border-zinc-800/40"
        }`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight text-white">{card.playerName}</h3>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {card.primaryPosition} ({card.positionSharePct}% role share)
              </span>
              {card.isU23 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-zinc-950">
                  U-23 ({card.age}y)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300">
                  Senior ({card.age}y)
                </span>
              )}
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold ${
                  card.isLocal
                    ? "rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    : "rounded-sm bg-amber-500/15 text-amber-300 border border-dashed border-amber-500/40"
                }`}
              >
                {card.isLocal ? "IDN (Local)" : `${card.nationality} (Foreign)`}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {card.teamName} • Liga 1 Season <span className="text-zinc-200 font-semibold">{card.season}</span>
              {card.prevSeason ? (
                <span>
                  {" "}
                  vs <span className="text-zinc-300 font-semibold">{card.prevSeason}</span> (2-Season Evolution)
                </span>
              ) : null}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-mono text-zinc-300">
              <span className="text-emerald-400 font-bold">{card.minutesPlayed}</span> mins ({card.matchesPlayed} matches)
            </div>
            {card.earlySeasonSample && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold">
                Early Season Sample (&gt;=180m rule)
              </span>
            )}
            {card.lowSampleWarning && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-semibold">
                Low Sample Warning (&lt;180m)
              </span>
            )}
          </div>
        </div>

        {/* Metrics List with Dual Metric Naming & Percentile Bars */}
        <div className="py-4 space-y-2.5">
          {(card.metrics ?? []).map((m: any) => {
            const barClass = getPercentileColor(m.percentile).split(" ")[0];
            const hasPrev = typeof m.prevValuePer90 === "number" && typeof m.prevPercentile === "number";
            const delta = hasPrev ? Math.round((m.valuePer90 - m.prevValuePer90) * 100) / 100 : null;

            return (
              <div key={m.key} className="grid grid-cols-12 items-center gap-3 text-xs">
                {/* Dual Metric Label */}
                <div className="col-span-5 min-w-0">
                  <div className="font-semibold text-zinc-100 truncate">{m.tacticalLabel}</div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate">{m.technicalCode}</div>
                </div>

                {/* Percentile Bar + 2-Season Evolution Marker */}
                <div className="col-span-4">
                  <div className="relative h-2.5 w-full rounded-full bg-zinc-800/90 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barClass}`}
                      style={{ width: `${Math.max(4, m.percentile)}%` }}
                    />
                    {hasPrev && (
                      <div
                        title={`Previous Season (${card.prevSeason}): ${m.prevPercentile}th pct`}
                        className="absolute top-0 bottom-0 w-1 bg-white/90 shadow"
                        style={{ left: `${Math.min(97, Math.max(2, m.prevPercentile))}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Tabular Values & Percentile Pill */}
                <div className="col-span-3 flex items-center justify-end gap-2 font-mono tabular-nums">
                  {hasPrev ? (
                    <span className="text-[11px] text-zinc-400">
                      {m.prevValuePer90} → <strong className="text-zinc-100">{m.valuePer90}</strong>
                      {delta !== null && (
                        <span className={delta >= 0 ? "text-emerald-400 ml-1" : "text-rose-400 ml-1"}>
                          ({delta >= 0 ? `+${delta}` : delta})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-zinc-200">{m.valuePer90}</span>
                  )}
                  <span className="w-9 text-center py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-200">
                    P{m.percentile}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {exportMode === "editorial_dark" && (
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
            <span>
              Benchmarked against {card.peerCount} Liga 1 {card.primaryPosition} peers • PAdj = per 500 opponent touches
            </span>
            <span className="font-mono text-zinc-400">Halfspace Intelligence • PostgreSQL + RAG</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 2. PRE-MATCH TACTICAL & PREDICTED STARTING XI PITCH BOARD
// ============================================================================
export function PrematchLineupCard({ card }: { card: any }) {
  const [exportMode, setExportMode] = useState<"editorial_dark" | "transparent_clean">("editorial_dark");
  const cardDomId = `prematch-card-${card.homeTeam?.teamId || 1}-${card.awayTeam?.teamId || 2}`;

  const renderTeamHalf = (team: any, isAway: boolean) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: team.teamColor || "#10b981" }}
            />
            {team.teamName}
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-300">
              {team.predictedFormation}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Form: <span className="font-mono text-zinc-200">{team.recentForm}</span> • Non-Pen xG:{" "}
            <span className="text-emerald-400 font-semibold">{team.stats.nonPenXgPerMatch}</span>/match
          </div>
        </div>
        <div className="text-right text-[10px]">
          <div
            className={`px-2 py-0.5 rounded font-semibold ${
              team.quotaCheck.compliesWithLiga1Rules
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300"
            }`}
          >
            U-23 Starter: {team.quotaCheck.u23StartersCount} • Foreign: {team.quotaCheck.foreignStartersCount}/6
          </div>
        </div>
      </div>

      {/* SVG Pitch Diagram */}
      <div className="relative h-64 w-full rounded-xl border border-emerald-900/50 bg-emerald-950/30 overflow-hidden">
        {/* Pitch lines */}
        <div className="absolute inset-2 border border-emerald-800/40 rounded-lg pointer-events-none" />
        <div className="absolute top-2 bottom-2 left-1/2 w-px bg-emerald-800/40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-emerald-800/40 pointer-events-none" />

        {(team.startingXI ?? []).map((p: any) => {
          const leftPct = isAway ? 100 - p.x : p.x;
          const isDoubtful = p.status === "doubtful";
          return (
            <div
              key={p.playerId}
              style={{ left: `${leftPct}%`, top: `${p.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center group"
            >
              <div
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-md border whitespace-nowrap ${
                  isDoubtful
                    ? "bg-amber-500 text-zinc-950 border-amber-300"
                    : p.isU23
                      ? "bg-emerald-500 text-zinc-950 border-emerald-300"
                      : !p.isLocal
                        ? "bg-zinc-900 text-amber-300 border-dashed border-amber-400/70"
                        : "bg-zinc-900/95 text-zinc-100 border-zinc-700"
                }`}
              >
                <span className="opacity-75 mr-1">{p.position}</span>
                {p.shortName}
                {p.isU23 && <span className="ml-1 text-[9px] underline">U23</span>}
              </div>
              {isDoubtful && (
                <div className="mt-0.5 px-1.5 py-0.2 rounded bg-amber-950/95 border border-amber-500/50 text-[9px] text-amber-200 whitespace-nowrap">
                  50/50 • Backup: {p.backupPlayerName}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidelined / Confirmed Out Strip */}
      <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 px-3 py-2 text-[11px]">
        <span className="font-semibold text-rose-400 mr-2">Absen / Sidelined:</span>
        {(team.sidelined ?? []).length === 0 ? (
          <span className="text-zinc-400">Skuad inti fit (tidak ada skorsing/cedera terkonfirmasi)</span>
        ) : (
          (team.sidelined ?? []).map((s: any, idx: number) => (
            <span key={s.playerName} className="text-zinc-300 mr-3">
              • <strong>{s.playerName}</strong> ({s.reason}){" "}
              <code className="text-[10px] text-emerald-400">[{s.citationDocId}]</code>
              {idx < team.sidelined.length - 1 ? " " : ""}
            </span>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="my-4 space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="inline-flex items-center gap-1.5 text-zinc-400">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">Visual Report Template · Pre-Match Tactical & Predicted XI Board</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            <button
              type="button"
              onClick={() => setExportMode("editorial_dark")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                exportMode === "editorial_dark" ? "bg-zinc-800 text-white" : "text-zinc-400"
              }`}
            >
              Editorial Dark
            </button>
            <button
              type="button"
              onClick={() => setExportMode("transparent_clean")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                exportMode === "transparent_clean" ? "bg-emerald-600/30 text-emerald-300" : "text-zinc-400"
              }`}
            >
              Transparent Clean
            </button>
          </div>
          <button
            type="button"
            onClick={() => void exportElementAsPng(cardDomId, "halfspace-prematch-xi", exportMode)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-medium cursor-pointer"
          >
            <Download className="w-3 h-3" />
            Export PNG
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        id={cardDomId}
        className={`rounded-2xl border p-5 space-y-4 ${
          exportMode === "editorial_dark" ? "bg-[#090A0F] border-zinc-800 shadow-2xl" : "bg-transparent border-zinc-800/40"
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="text-base font-bold text-white">{card.matchLabel}</h3>
            <p className="text-xs text-zinc-400">
              Predicted Starting XI • News Injury/Doubtful Check • PSSI/LIB Quota Verified [reg-liga1-u23-2627]
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-zinc-950 font-bold">Green = U-23 Mandatory</span>
            <span className="px-2 py-0.5 rounded bg-amber-500 text-zinc-950 font-bold">Yellow = 50/50 Doubtful + Backup</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {renderTeamHalf(card.homeTeam, false)}
          {renderTeamHalf(card.awayTeam, true)}
        </div>

        {/* Head-to-Head Metric Comparison Strip */}
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-zinc-800/80 text-center text-xs">
          <div className="rounded-xl bg-zinc-900/60 p-2.5">
            <div className="text-[10px] text-zinc-400">Open-Play xG / Match</div>
            <div className="font-mono font-bold text-zinc-100 mt-0.5">
              {card.homeTeam.stats.openPlayXgPerMatch} vs {card.awayTeam.stats.openPlayXgPerMatch}
            </div>
          </div>
          <div className="rounded-xl bg-zinc-900/60 p-2.5">
            <div className="text-[10px] text-zinc-400">Set-Piece xG / Match</div>
            <div className="font-mono font-bold text-zinc-100 mt-0.5">
              {card.homeTeam.stats.setPieceXgPerMatch} vs {card.awayTeam.stats.setPieceXgPerMatch}
            </div>
          </div>
          <div className="rounded-xl bg-zinc-900/60 p-2.5">
            <div className="text-[10px] text-zinc-400">Attacking 3rd Touch Share</div>
            <div className="font-mono font-bold text-zinc-100 mt-0.5">
              {card.homeTeam.stats.att3rdTouchSharePct}% vs {card.awayTeam.stats.att3rdTouchSharePct}%
            </div>
          </div>
          <div className="rounded-xl bg-zinc-900/60 p-2.5">
            <div className="text-[10px] text-zinc-400">PAdj Defensive Intensity</div>
            <div className="font-mono font-bold text-zinc-100 mt-0.5">
              {card.homeTeam.stats.padjDefensiveActions} vs {card.awayTeam.stats.padjDefensiveActions}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. PEER COMPARISON CARD (Adaptive: 2 Players = Head-to-Head Bars, >=3 = 2D Scatter Quadrant)
// ============================================================================
export function PeerComparisonCard({ card }: { card: any }) {
  const [exportMode, setExportMode] = useState<"editorial_dark" | "transparent_clean">("editorial_dark");
  const cardDomId = `peer-comparison-${card.season?.replace("/", "") || "liga1"}`;
  const players = card.players ?? [];

  const maxX = Math.max(1, ...players.map((p: any) => Number(p.xValue ?? 0))) * 1.15;
  const maxY = Math.max(1, ...players.map((p: any) => Number(p.yValue ?? 0))) * 1.15;

  return (
    <div className="my-4 space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="inline-flex items-center gap-1.5 text-zinc-400">
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">
            Visual Report Template ·{" "}
            {card.mode === "head_to_head_bars" ? "Head-to-Head Comparison" : "2D Scouting Scatter Quadrant"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            <button
              type="button"
              onClick={() => setExportMode("editorial_dark")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                exportMode === "editorial_dark" ? "bg-zinc-800 text-white" : "text-zinc-400"
              }`}
            >
              Editorial Dark
            </button>
            <button
              type="button"
              onClick={() => setExportMode("transparent_clean")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                exportMode === "transparent_clean" ? "bg-emerald-600/30 text-emerald-300" : "text-zinc-400"
              }`}
            >
              Transparent Clean
            </button>
          </div>
          <button
            type="button"
            onClick={() => void exportElementAsPng(cardDomId, "halfspace-peer-comparison", exportMode)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-medium cursor-pointer"
          >
            <Download className="w-3 h-3" />
            Export PNG
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        id={cardDomId}
        className={`rounded-2xl border p-5 space-y-4 ${
          exportMode === "editorial_dark" ? "bg-[#090A0F] border-zinc-800 shadow-2xl" : "bg-transparent border-zinc-800/40"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="text-base font-bold text-white">{card.title}</h3>
            <p className="text-xs text-zinc-400">{card.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-bold">Emerald Pill = U-23</span>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40">
              Solid Pill = Local (IDN)
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-amber-500/15 text-amber-300 border border-dashed border-amber-400/50">
              Dashed Box = Foreign
            </span>
          </div>
        </div>

        {/* 2D Scatter Quadrant */}
        <div className="relative h-72 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 overflow-hidden">
          {/* Quadrant Median Dashed Lines */}
          <div
            style={{ left: `${Math.min(85, Math.max(15, (card.xMedian / maxX) * 100))}%` }}
            className="absolute top-0 bottom-0 border-l border-dashed border-zinc-700/80 pointer-events-none"
          />
          <div
            style={{ bottom: `${Math.min(85, Math.max(15, (card.yMedian / maxY) * 100))}%` }}
            className="absolute left-0 right-0 border-t border-dashed border-zinc-700/80 pointer-events-none"
          />

          {/* Quadrant Watermark Labels */}
          <div className="absolute top-2 right-3 text-[10px] font-semibold text-emerald-400/70">
            ELITE TWO-WAY (High Progression + High PAdj Defense)
          </div>
          <div className="absolute bottom-2 left-3 text-[10px] text-zinc-500">
            X: {card.xAxisLabel} ({card.xAxisCode}) →
          </div>
          <div className="absolute top-2 left-3 text-[10px] text-zinc-500">
            ↑ Y: {card.yAxisLabel} ({card.yAxisCode})
          </div>

          {players.map((p: any, idx: number) => {
            const xPct = Math.min(90, Math.max(8, (Number(p.xValue) / maxX) * 88 + (idx % 3) * 2));
            const yPct = Math.min(88, Math.max(12, (Number(p.yValue) / maxY) * 84 + (idx % 2) * 3));

            return (
              <div
                key={p.playerId}
                style={{ left: `${xPct}%`, bottom: `${yPct}%` }}
                className="absolute -translate-x-1/2 translate-y-1/2"
              >
                <div
                  className={`px-2 py-0.5 text-[10px] font-bold shadow-lg whitespace-nowrap transition-transform hover:scale-110 ${
                    p.isLocal ? "rounded-full border" : "rounded-none border border-dashed"
                  } ${
                    p.isU23
                      ? "bg-emerald-500 text-zinc-950 border-emerald-200"
                      : p.isFocal
                        ? "bg-sky-500 text-zinc-950 border-white"
                        : "bg-zinc-900/95 text-zinc-200 border-zinc-600"
                  }`}
                >
                  {p.shortName} <span className="opacity-75 font-mono">({p.xValue}, {p.yValue})</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase text-zinc-400">
                <th className="py-2 px-2">Player</th>
                <th className="py-2 px-2">Club</th>
                <th className="py-2 px-2">Role / Age</th>
                <th className="py-2 px-2 text-right">Mins</th>
                <th className="py-2 px-2 text-right">Acc. Long Balls/90</th>
                <th className="py-2 px-2 text-right">Key Passes/90</th>
                <th className="py-2 px-2 text-right">PAdj Defense</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
              {players.slice(0, 6).map((p: any) => (
                <tr key={p.playerId} className="hover:bg-zinc-900/50">
                  <td className="py-1.5 px-2 font-sans font-semibold text-zinc-100">{p.playerName}</td>
                  <td className="py-1.5 px-2 font-sans text-zinc-400">{p.teamName}</td>
                  <td className="py-1.5 px-2 font-sans">
                    <span className="text-emerald-400 font-semibold">{p.position}</span> • {p.age}y ({p.nationality})
                  </td>
                  <td className="py-1.5 px-2 text-right text-zinc-300">{p.minutesPlayed}</td>
                  <td className="py-1.5 px-2 text-right text-emerald-300">
                    {p.metrics?.["Acc. Long Balls / 90"] ?? p.xValue}
                  </td>
                  <td className="py-1.5 px-2 text-right text-sky-300">{p.metrics?.["Key Passes / 90"] ?? 0}</td>
                  <td className="py-1.5 px-2 text-right text-amber-300">
                    {p.metrics?.["PAdj Total Defense"] ?? p.yValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
