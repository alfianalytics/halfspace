import { useState } from "react";
import { Download } from "lucide-react";

/**
 * Pure SVG / Canvas PNG Exporter for Halfspace Editorial Visual Cards
 * Supports Dual Export Modes: `editorial_dark` (#0F172A) and `transparent_clean`.
 */
async function exportElementAsPng(
  elementId: string,
  filename: string,
  mode: "editorial_dark" | "transparent_clean",
) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const width = Math.max(760, Math.round(rect.width));
  const height = Math.max(420, Math.round(rect.height));

  const clone = el.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.background = mode === "transparent_clean" ? "transparent" : "#0F172A";
  clone.style.color = "#F8FAFC";
  clone.style.fontFamily = "'Archivo', system-ui, sans-serif";

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
        ctx.fillStyle = "#0F172A";
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

function getBarColor(pct: number): string {
  if (pct >= 75) return "bg-[#6EE7B7]"; // Hero Mint
  if (pct >= 45) return "bg-[#38BDF8]"; // Sky Blue
  return "bg-[#FF6350]"; // Warm Coral
}

function getPctTextColor(pct: number): string {
  if (pct >= 75) return "text-[#6EE7B7]";
  if (pct >= 45) return "text-[#38BDF8]";
  return "text-[#FF6350]";
}

function ExportToolbar({
  title,
  exportMode,
  setExportMode,
  onDownload,
  extraControls,
}: {
  title: string;
  exportMode: "editorial_dark" | "transparent_clean";
  setExportMode: (m: "editorial_dark" | "transparent_clean") => void;
  onDownload: () => void;
  extraControls?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs">
      <span className="font-tech text-[10px] uppercase tracking-widest text-[#38BDF8]">{title}</span>
      <div className="flex flex-wrap items-center gap-2">
        {extraControls}
        <div className="inline-flex border border-[#334155] bg-[#0B1120] rounded p-0.5 font-tech text-[10px]">
          <button
            type="button"
            onClick={() => setExportMode("editorial_dark")}
            className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
              exportMode === "editorial_dark"
                ? "bg-[#1E293B] text-[#F8FAFC]"
                : "text-[#64748B] hover:text-[#CBD5E1]"
            }`}
          >
            Editorial Dark
          </button>
          <button
            type="button"
            onClick={() => setExportMode("transparent_clean")}
            className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
              exportMode === "transparent_clean"
                ? "bg-[#6EE7B7]/20 text-[#6EE7B7]"
                : "text-[#64748B] hover:text-[#CBD5E1]"
            }`}
          >
            Transparent Clean
          </button>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 rounded bg-[#6EE7B7] hover:bg-[#34D399] text-[#0F172A] px-2.5 py-1 font-tech text-[10px] font-bold transition-colors cursor-pointer"
        >
          <Download className="w-3 h-3" />
          EXPORT PNG
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 1. PLAYER SCOUTING & TWO-SEASON EVOLUTION CARD (Flat Editorial Hairline)
// ============================================================================
export function PlayerScoutingCard({ card }: { card: any }) {
  const [exportMode, setExportMode] = useState<"editorial_dark" | "transparent_clean">("editorial_dark");
  const cardDomId = `scouting-card-${card.playerId}-${String(card.season).replace("/", "")}`;

  return (
    <div className="my-4 space-y-2">
      <ExportToolbar
        title="Visual Report • Player Scouting & Evolution"
        exportMode={exportMode}
        setExportMode={setExportMode}
        onDownload={() => void exportElementAsPng(cardDomId, `halfspace-${card.shortName}`, exportMode)}
      />

      <div
        id={cardDomId}
        className={`border p-5 space-y-4 ${
          exportMode === "editorial_dark"
            ? "bg-[#0F172A] border-[#334155]"
            : "bg-transparent border-[#334155]/40"
        }`}
      >
        {/* Editorial Header */}
        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-3 border-b border-[#334155]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-editorial text-2xl font-bold tracking-tight text-[#F8FAFC]">
                {card.playerName}
              </h3>
              <span className="font-tech text-[10px] px-1.5 py-0.5 border border-[#6EE7B7]/40 text-[#6EE7B7]">
                {card.primaryPosition} ({card.positionSharePct}% SHARE)
              </span>
              <span className="font-tech text-[10px] px-1.5 py-0.5 border border-[#334155] text-[#CBD5E1]">
                {card.isU23 ? `U-23 (${card.age}y)` : `SENIOR (${card.age}y)`} •{" "}
                {card.isLocal ? "LOCAL" : `${card.nationality}`}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              {card.teamName}
              {card.leagueName ? ` • ${card.leagueName}` : ""} • Season{" "}
              <span className="text-[#F8FAFC] font-semibold">{card.season}</span>
              {card.prevSeason ? ` vs ${card.prevSeason} (2-Season Evolution)` : ""}
            </p>
          </div>

          <div className="text-right font-tech text-[11px] tabular">
            <div>
              <span className="text-[#6EE7B7] font-bold">{card.minutesPlayed}</span> mins ({card.matchesPlayed} matches)
            </div>
            {card.earlySeasonSample && (
              <div className="text-[10px] text-[#FF6350] mt-0.5">EARLY SEASON SAMPLE (&ge;180m)</div>
            )}
            {card.lowSampleWarning && (
              <div className="text-[10px] text-[#FF6350] mt-0.5">LOW SAMPLE WARNING (&lt;180m)</div>
            )}
          </div>
        </div>

        {/* Hairline Metric Rows (Dual Metric Naming, Zero Nested Card Soup) */}
        <div className="divide-y divide-[#334155]/70 border-b border-[#334155]">
          {(card.metrics ?? []).map((m: any) => {
            const hasPrev = typeof m.prevValuePer90 === "number" && typeof m.prevPercentile === "number";
            const delta = hasPrev ? Math.round((m.valuePer90 - m.prevValuePer90) * 100) / 100 : null;

            return (
              <div key={m.key} className="py-2 grid grid-cols-12 items-center gap-3 text-xs">
                <div className="col-span-5 min-w-0">
                  <div className="font-semibold text-[#F8FAFC] truncate">{m.tacticalLabel}</div>
                  <div className="font-tech text-[10px] text-[#64748B] truncate">{m.technicalCode}</div>
                </div>

                <div className="col-span-4">
                  <div className="relative h-1.5 w-full bg-[#1E293B] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getBarColor(m.percentile)}`}
                      style={{ width: `${Math.max(4, m.percentile)}%` }}
                    />
                    {hasPrev && (
                      <div
                        title={`Previous Season (${card.prevSeason}): P${m.prevPercentile}`}
                        className="absolute top-0 bottom-0 w-0.5 bg-[#F8FAFC]"
                        style={{ left: `${Math.min(98, Math.max(2, m.prevPercentile))}%` }}
                      />
                    )}
                  </div>
                </div>

                <div className="col-span-3 flex items-center justify-end gap-2.5 font-tech tabular">
                  {hasPrev ? (
                    <span className="text-[11px] text-[#94A3B8]">
                      {m.prevValuePer90}&rarr;<strong className="text-[#F8FAFC]">{m.valuePer90}</strong>
                      {delta !== null && (
                        <span className={delta >= 0 ? "text-[#6EE7B7] ml-1" : "text-[#FF6350] ml-1"}>
                          ({delta >= 0 ? `+${delta}` : delta})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#F8FAFC]">
                      {m.valuePer90}
                      {m.unit || ""}
                    </span>
                  )}
                  <span className={`w-8 text-right font-bold ${getPctTextColor(m.percentile)}`}>
                    P{m.percentile}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {exportMode === "editorial_dark" && (
          <div className="flex items-center justify-between font-tech text-[10px] text-[#64748B]">
            <span>
              BENCHMARK: {card.peerCount} {card.primaryPosition} PEERS • PADJ / 500 OPP. TOUCHES
            </span>
            <span className="text-[#94A3B8]">HALFSPACE. • POSTGRESQL + RAG</span>
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
      <div className="flex items-baseline justify-between border-b border-[#334155]/70 pb-2">
        <div>
          <div className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: team.teamColor || "#6EE7B7" }} />
            {team.teamName}
            <span className="font-tech text-[11px] text-[#6EE7B7]">{team.predictedFormation}</span>
          </div>
          <div className="font-tech text-[10px] text-[#94A3B8] mt-0.5 tabular">
            FORM: {team.recentForm} • NP-xG: {team.stats.nonPenXgPerMatch}/m
          </div>
        </div>
        <div className="font-tech text-[10px] text-[#6EE7B7]">
          U-23: {team.quotaCheck.u23StartersCount} • FOREIGN: {team.quotaCheck.foreignStartersCount}/6
        </div>
      </div>

      {/* Tactical Pitch Board */}
      <div className="relative h-64 w-full border border-[#334155] bg-[#0B1120] overflow-hidden">
        <div className="absolute inset-2 border border-[#334155]/60 pointer-events-none" />
        <div className="absolute top-2 bottom-2 left-1/2 w-px bg-[#334155]/60 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-[#334155]/60 pointer-events-none" />

        {(team.startingXI ?? []).map((p: any) => {
          const leftPct = isAway ? 100 - p.x : p.x;
          const isDoubtful = p.status === "doubtful";
          return (
            <div
              key={p.playerId}
              style={{ left: `${leftPct}%`, top: `${p.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center"
            >
              <div
                className={`px-1.5 py-0.5 text-[10px] font-bold border whitespace-nowrap ${
                  isDoubtful
                    ? "bg-[#FF6350] text-[#0F172A] border-[#FCA5A5]"
                    : p.isU23
                      ? "bg-[#6EE7B7] text-[#0F172A] border-[#A7F3D0]"
                      : !p.isLocal
                        ? "bg-[#0F172A] text-[#38BDF8] border-dashed border-[#38BDF8]"
                        : "bg-[#1E293B] text-[#F8FAFC] border-[#475569]"
                }`}
              >
                <span className="font-tech opacity-75 mr-1">{p.position}</span>
                {p.shortName}
                {p.isU23 && <span className="ml-1 font-tech text-[9px]">U23</span>}
              </div>
              {isDoubtful && (
                <div className="mt-0.5 px-1 bg-[#0F172A] border border-[#FF6350]/60 font-tech text-[9px] text-[#FF6350] whitespace-nowrap">
                  50/50 • Backup: {p.backupPlayerName}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidelined Strip */}
      <div className="border-t border-[#334155]/70 pt-2 text-[11px] text-[#CBD5E1]">
        <span className="font-tech text-[10px] uppercase text-[#FF6350] font-bold mr-2">Absen:</span>
        {(team.sidelined ?? []).length === 0 ? (
          <span className="text-[#64748B]">Skuad inti fit</span>
        ) : (
          (team.sidelined ?? []).map((s: any) => (
            <span key={s.playerName} className="mr-3">
              <strong>{s.playerName}</strong> ({s.reason}){" "}
              <code className="font-tech text-[10px] text-[#6EE7B7]">[{s.citationDocId}]</code>
            </span>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="my-4 space-y-2">
      <ExportToolbar
        title="Visual Report • Pre-Match Tactical & Predicted XI"
        exportMode={exportMode}
        setExportMode={setExportMode}
        onDownload={() => void exportElementAsPng(cardDomId, "halfspace-prematch-xi", exportMode)}
      />

      <div
        id={cardDomId}
        className={`border p-5 space-y-4 ${
          exportMode === "editorial_dark"
            ? "bg-[#0F172A] border-[#334155]"
            : "bg-transparent border-[#334155]/40"
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#334155]">
          <div>
            <h3 className="font-editorial text-xl font-bold text-[#F8FAFC]">{card.matchLabel}</h3>
            <p className="font-tech text-[10px] text-[#94A3B8] mt-0.5">
              PREDICTED STARTING XI • NEWS INJURY/DOUBTFUL CHECK • QUOTA VERIFIED [reg-liga1-u23-2627]
            </p>
          </div>
          <div className="flex items-center gap-3 font-tech text-[10px]">
            <span className="text-[#6EE7B7]">■ U-23 MANDATORY</span>
            <span className="text-[#FF6350]">■ 50/50 DOUBTFUL + BACKUP</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderTeamHalf(card.homeTeam, false)}
          {renderTeamHalf(card.awayTeam, true)}
        </div>

        {/* Hairline H2H Metric Row */}
        <div className="grid grid-cols-4 divide-x divide-[#334155] border-t border-[#334155] pt-3 text-center font-tech tabular">
          <div className="px-2">
            <div className="text-[10px] text-[#64748B]">OPEN-PLAY xG/M</div>
            <div className="text-xs font-bold text-[#F8FAFC] mt-0.5">
              {card.homeTeam.stats.openPlayXgPerMatch} vs {card.awayTeam.stats.openPlayXgPerMatch}
            </div>
          </div>
          <div className="px-2">
            <div className="text-[10px] text-[#64748B]">SET-PIECE xG/M</div>
            <div className="text-xs font-bold text-[#F8FAFC] mt-0.5">
              {card.homeTeam.stats.setPieceXgPerMatch} vs {card.awayTeam.stats.setPieceXgPerMatch}
            </div>
          </div>
          <div className="px-2">
            <div className="text-[10px] text-[#64748B]">ATT 3RD SHARE</div>
            <div className="text-xs font-bold text-[#38BDF8] mt-0.5">
              {card.homeTeam.stats.att3rdTouchSharePct}% vs {card.awayTeam.stats.att3rdTouchSharePct}%
            </div>
          </div>
          <div className="px-2">
            <div className="text-[10px] text-[#64748B]">PADJ DEFENSE</div>
            <div className="text-xs font-bold text-[#6EE7B7] mt-0.5">
              {card.homeTeam.stats.padjDefensiveActions} vs {card.awayTeam.stats.padjDefensiveActions}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. PEER COMPARISON CARD (2D Scatter Quadrant + Head-to-Head + Tabular Cohort)
// ============================================================================
export function PeerComparisonCard({ card }: { card: any }) {
  const [exportMode, setExportMode] = useState<"editorial_dark" | "transparent_clean">("editorial_dark");
  const cardDomId = `peer-comparison-${card.season?.replace("/", "") || "liga1"}-${card.xAxisCode || "x"}`;
  const players = card.players ?? [];

  const maxX = Math.max(0.5, ...players.map((p: any) => Number(p.xValue ?? 0))) * 1.15;
  const maxY = Math.max(0.5, ...players.map((p: any) => Number(p.yValue ?? 0))) * 1.15;

  return (
    <div className="my-4 space-y-2">
      <ExportToolbar
        title={`Visual Report • ${card.mode === "head_to_head_bars" ? "Head-to-Head" : "2D Scouting Quadrant"}`}
        exportMode={exportMode}
        setExportMode={setExportMode}
        onDownload={() => void exportElementAsPng(cardDomId, "halfspace-peer-comparison", exportMode)}
      />

      <div
        id={cardDomId}
        className={`border p-5 space-y-4 ${
          exportMode === "editorial_dark"
            ? "bg-[#0F172A] border-[#334155]"
            : "bg-transparent border-[#334155]/40"
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#334155]">
          <div>
            <h3 className="font-editorial text-xl font-bold text-[#F8FAFC]">{card.title}</h3>
            <p className="font-tech text-[10px] text-[#94A3B8] mt-0.5">{card.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 font-tech text-[10px]">
            <span className="text-[#6EE7B7]">● U-23</span>
            <span className="text-[#38BDF8]">● FOCAL / LOCAL</span>
            <span className="text-[#FF6350]">□ FOREIGN (DASHED)</span>
          </div>
        </div>

        {/* 2D Quadrant Canvas */}
        <div className="relative h-80 w-full border border-[#334155] bg-[#0B1120] p-4 overflow-hidden">
          <div
            style={{ left: `${Math.min(86, Math.max(14, (Number(card.xMedian || 0) / maxX) * 100))}%` }}
            className="absolute top-0 bottom-0 border-l border-dashed border-[#334155] pointer-events-none"
          />
          <div
            style={{ bottom: `${Math.min(86, Math.max(14, (Number(card.yMedian || 0) / maxY) * 100))}%` }}
            className="absolute left-0 right-0 border-t border-dashed border-[#334155] pointer-events-none"
          />

          <div className="absolute top-2 right-3 font-tech text-[10px] text-[#6EE7B7]">
            UPPER-RIGHT OUTLIERS (ABOVE MEDIAN BOTH AXES)
          </div>
          <div className="absolute bottom-2 left-3 font-tech text-[10px] text-[#94A3B8]">
            X: {card.xAxisLabel} <span className="text-[#64748B]">({card.xAxisCode})</span> &rarr;
          </div>
          <div className="absolute top-2 left-3 font-tech text-[10px] text-[#94A3B8]">
            &uarr; Y: {card.yAxisLabel} <span className="text-[#64748B]">({card.yAxisCode})</span>
          </div>

          {players.map((p: any, idx: number) => {
            const xPct = Math.min(90, Math.max(8, (Number(p.xValue) / maxX) * 86 + ((idx % 3) - 1) * 1.5));
            const yPct = Math.min(88, Math.max(12, (Number(p.yValue) / maxY) * 82 + ((idx % 2) - 0.5) * 2.5));

            return (
              <div
                key={p.playerId}
                style={{ left: `${xPct}%`, bottom: `${yPct}%`, zIndex: p.isFocal ? 20 : 10 }}
                className="absolute -translate-x-1/2 translate-y-1/2"
              >
                <div
                  className={`px-2 py-0.5 text-[10px] font-bold whitespace-nowrap transition-transform hover:scale-105 ${
                    p.isLocal ? "rounded-full border" : "rounded-none border border-dashed"
                  } ${
                    p.isFocal
                      ? "bg-[#38BDF8] text-[#0F172A] border-[#F8FAFC] ring-2 ring-[#38BDF8]/40"
                      : p.isU23
                        ? "bg-[#6EE7B7] text-[#0F172A] border-[#A7F3D0]"
                        : "bg-[#1E293B]/95 text-[#F8FAFC] border-[#475569]"
                  }`}
                >
                  {p.shortName} <span className="font-tech opacity-80">({p.xValue}, {p.yValue})</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dense Tabular Cohort Table */}
        <div className="overflow-x-auto border-t border-[#334155]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#334155] font-tech text-[10px] uppercase text-[#64748B]">
                <th className="py-2 px-2">Player</th>
                <th className="py-2 px-2">Club</th>
                <th className="py-2 px-2">Role / Age</th>
                <th className="py-2 px-2 text-right">Mins</th>
                <th className="py-2 px-2 text-right text-[#6EE7B7]">{card.xAxisCode || "x_metric"}</th>
                <th className="py-2 px-2 text-right text-[#38BDF8]">{card.yAxisCode || "y_metric"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 font-tech text-[11px] tabular">
              {players.slice(0, 10).map((p: any) => (
                <tr key={p.playerId} className={p.isFocal ? "bg-[#38BDF8]/10" : "hover:bg-[#1E293B]/40"}>
                  <td className="py-1.5 px-2 font-data font-semibold text-[#F8FAFC]">
                    {p.playerName}
                    {p.isFocal && <span className="ml-1.5 font-tech text-[9px] text-[#38BDF8]">FOCAL</span>}
                  </td>
                  <td className="py-1.5 px-2 font-data text-[#94A3B8]">{p.teamName}</td>
                  <td className="py-1.5 px-2 text-[#CBD5E1]">
                    <span className="text-[#6EE7B7]">{p.position}</span> • {p.age}y ({p.nationality})
                  </td>
                  <td className="py-1.5 px-2 text-right text-[#CBD5E1]">{p.minutesPlayed}</td>
                  <td className="py-1.5 px-2 text-right text-[#6EE7B7] font-bold">{p.xValue}</td>
                  <td className="py-1.5 px-2 text-right text-[#38BDF8] font-bold">{p.yValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. TEAM TACTICAL STYLE, STRENGTHS/WEAKNESSES & KEY PLAYERS (24-METRIC MATRIX)
// ============================================================================
const TEAM_MATRIX_SECTIONS = [
  {
    main: "STYLE METRICS",
    sub: "IN POSSESSION",
    metrics: [
      { id: "deep_buildup_g", label: "Deep Build-Up", formula: "1 - gk_long/gk_pass" },
      { id: "possession", label: "Possession", formula: "team_pass / total_pass" },
      { id: "field_tilt_3rd_passes", label: "Field Tilt", formula: "team_att3rd / total_3rd" },
      { id: "dribbles", label: "Dribble Tendencies", formula: "dribbles_att / touches" },
      { id: "central_progression_3rd", label: "Central Progression", formula: "-crosses / att_3rd" },
      { id: "patient_3rd", label: "Final 3rd Patience", formula: "-shots / att_3rd" },
      { id: "patient_all", label: "Overall Patience", formula: "-shots / touches" },
      { id: "shot_quality", label: "Shot Quality", formula: "npxg / np_shots" },
    ],
  },
  {
    main: "STYLE METRICS",
    sub: "OUT OF POSSESSION",
    metrics: [
      { id: "forward_press_w_am_f", label: "Forward Press", formula: "-opp_build / fwd_acts" },
      { id: "defender_press_g_d_cm", label: "Def-Mid Press", formula: "-opp_att / def_acts" },
      { id: "high_line", label: "High Line", formula: "(offs + sweep)/opp_pass" },
      { id: "discipline_def_actions", label: "Discipline", formula: "-fouls / def_actions" },
    ],
  },
  {
    main: "PERFORMANCE METRICS",
    sub: "ATTACK",
    metrics: [
      { id: "open_play_attack", label: "Open Play Attack", formula: "open_play_xg / match" },
      { id: "set_piece_attack", label: "Set-Piece Attack", formula: "set_piece_xg / match" },
      { id: "press_resistance", label: "Press Resistance", formula: "-dispossessed / touches" },
      { id: "dribbles_completion", label: "Dribbles Completion", formula: "drib_won / drib_att" },
      { id: "crosses_completion", label: "Crosses Completion", formula: "acc_cross / crosses" },
      { id: "finishing", label: "Finishing Efficiency", formula: "xgot / xg" },
    ],
  },
  {
    main: "PERFORMANCE METRICS",
    sub: "DEFENCE",
    metrics: [
      { id: "open_play_defence", label: "Open Play Defence", formula: "-opp_op_xg / match" },
      { id: "set_piece_defence", label: "Set-Piece Defence", formula: "-opp_sp_xg / match" },
      { id: "disrupt_opp_buildup", label: "Disrupt Opp Build-Up", formula: "opp_disp / opp_touch" },
      { id: "dribbles_defence", label: "Dribbles Defence", formula: "-opp_drib_won / att" },
      { id: "crosses_defence", label: "Crosses Defence", formula: "-opp_acc_cross / att" },
      { id: "saving", label: "Shot-Stopping", formula: "opp_xgot / opp_goals" },
    ],
  },
] as const;

export function TeamStyleProfileCard({ card }: { card: any }) {
  const [exportMode, setExportMode] = useState<"editorial_dark" | "transparent_clean">("editorial_dark");
  const [windowMode, setWindowMode] = useState<"season" | "last6">("season");
  const cardDomId = `team-style-${card.teamId}-${String(card.season).replace("/", "")}`;

  const sits: any[] = card.situations ?? [];
  const findSit = (name: string) => sits.find((s) => s.situation === name);

  const colAll = windowMode === "season" ? findSit("All") : findSit("Last 6") ?? findSit("All");
  const colHome = windowMode === "season" ? findSit("Home") : findSit("Last 6 Home") ?? findSit("Home");
  const colAway = windowMode === "season" ? findSit("Away") : findSit("Last 6 Away") ?? findSit("Away");

  const activeCols = [
    { key: "overall", label: windowMode === "season" ? "ALL" : "LAST 6", data: colAll },
    { key: "home", label: windowMode === "season" ? "HOME" : "L6 HOME", data: colHome },
    { key: "away", label: windowMode === "season" ? "AWAY" : "L6 AWAY", data: colAway },
  ];

  const renderSectionBlock = (sec: (typeof TEAM_MATRIX_SECTIONS)[number]) => (
    <div key={`${sec.main}-${sec.sub}`} className="space-y-1.5">
      <div className="grid grid-cols-12 items-center pb-1 border-b border-[#334155] font-tech text-[10px] uppercase tracking-wider">
        <div className="col-span-5 text-[#38BDF8] font-bold">
          {sec.main === "STYLE METRICS" ? "STYLE" : "PERF"} · {sec.sub}
        </div>
        {activeCols.map((c) => (
          <div key={c.key} className="col-span-2 text-right text-[#94A3B8] pr-1">
            {c.label} {c.data ? `(${c.data.matches})` : ""}
          </div>
        ))}
        <div className="col-span-1 text-right text-[#64748B]">PCT</div>
      </div>

      <div className="divide-y divide-[#334155]/50">
        {sec.metrics.map((m) => {
          const primaryPct = colAll?.percentiles?.[m.id] ?? 50;
          return (
            <div key={m.id} className="py-1.5 grid grid-cols-12 items-center gap-1.5 text-[11px]">
              <div className="col-span-5 min-w-0 pr-1">
                <div className="font-semibold text-[#F8FAFC] truncate leading-tight">{m.label}</div>
                <div className="font-tech text-[9px] text-[#64748B] truncate">{m.formula}</div>
              </div>

              {activeCols.map((c) => {
                const pct = c.data?.percentiles?.[m.id] ?? 50;
                const val = c.data?.values?.[m.id] ?? 0;
                return (
                  <div key={c.key} className="col-span-2 space-y-0.5 pr-1">
                    <div className="h-1.5 w-full bg-[#1E293B] overflow-hidden">
                      <div
                        className={`h-full ${getBarColor(pct)}`}
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between font-tech text-[9px] tabular">
                      <span className="text-[#CBD5E1]">{val}</span>
                      <span className={getPctTextColor(pct)}>P{pct}</span>
                    </div>
                  </div>
                );
              })}

              <div className={`col-span-1 text-right font-tech text-[10px] font-bold tabular ${getPctTextColor(primaryPct)}`}>
                P{primaryPct}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const formBadges = String(card.recentForm || "")
    .split("-")
    .filter(Boolean);

  return (
    <div className="my-4 space-y-2">
      <ExportToolbar
        title="Visual Dossier • Team Playing Style, Strengths/Weaknesses & Key Players"
        exportMode={exportMode}
        setExportMode={setExportMode}
        onDownload={() => void exportElementAsPng(cardDomId, `halfspace-style-${card.teamName}`, exportMode)}
        extraControls={
          <div className="inline-flex border border-[#334155] bg-[#0B1120] rounded p-0.5 font-tech text-[10px]">
            <button
              type="button"
              onClick={() => setWindowMode("season")}
              className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
                windowMode === "season" ? "bg-[#38BDF8]/20 text-[#38BDF8]" : "text-[#64748B] hover:text-[#CBD5E1]"
              }`}
            >
              Full Season
            </button>
            <button
              type="button"
              onClick={() => setWindowMode("last6")}
              className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
                windowMode === "last6" ? "bg-[#38BDF8]/20 text-[#38BDF8]" : "text-[#64748B] hover:text-[#CBD5E1]"
              }`}
            >
              Last 6 Form
            </button>
          </div>
        }
      />

      <div
        id={cardDomId}
        className={`border p-5 space-y-5 ${
          exportMode === "editorial_dark"
            ? "bg-[#0F172A] border-[#334155]"
            : "bg-transparent border-[#334155]/40"
        }`}
      >
        {/* Editorial Masthead */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-3.5 border-b border-[#334155]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full inline-block border border-[#F8FAFC]/30"
                style={{ backgroundColor: card.teamColor || "#6EE7B7" }}
              />
              <h3 className="font-editorial text-2xl font-bold tracking-tight text-[#F8FAFC]">
                {card.teamName}
              </h3>
              <span className="font-tech text-[10px] px-2 py-0.5 border border-[#334155] text-[#CBD5E1]">
                {card.leagueName} • {card.season}
              </span>
            </div>

            {/* Playing Style Archetype Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {(card.styleArchetypes ?? []).map((a: any) => (
                <span
                  key={a.metricId}
                  className="font-tech text-[10px] px-2 py-0.5 border border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#38BDF8]"
                >
                  {a.tag} · P{a.percentile}
                </span>
              ))}
              {(card.dominantFormations ?? []).slice(0, 2).map((f: any) => (
                <span
                  key={f.formation}
                  className="font-tech text-[10px] px-2 py-0.5 border border-[#6EE7B7]/40 text-[#6EE7B7]"
                >
                  {f.formation} ({f.sharePct}%)
                </span>
              ))}
            </div>
          </div>

          <div className="text-right space-y-1 font-tech tabular">
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] text-[#64748B] mr-1">RECENT FORM:</span>
              {formBadges.map((ch, idx) => (
                <span
                  key={idx}
                  className={`w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold ${
                    ch === "W"
                      ? "bg-[#6EE7B7] text-[#0F172A]"
                      : ch === "L"
                        ? "bg-[#FF6350] text-[#0F172A]"
                        : "bg-[#334155] text-[#F8FAFC]"
                  }`}
                >
                  {ch}
                </span>
              ))}
            </div>
            {colAll && (
              <div className="text-[11px] text-[#CBD5E1]">
                <span className="text-[#6EE7B7] font-bold">{colAll.goalsForPerMatch}</span> GF/m •{" "}
                <span className="text-[#FF6350] font-bold">{colAll.goalsAgainstPerMatch}</span> GA/m ({colAll.matches}m)
              </div>
            )}
          </div>
        </div>

        {/* Strengths vs Exploitable Weaknesses Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#334155]">
          <div className="border-l-2 border-[#6EE7B7] pl-3.5 space-y-2">
            <div className="font-tech text-[10px] uppercase tracking-widest text-[#6EE7B7] font-bold">
              Tactical Strengths (League Top Tier)
            </div>
            <div className="space-y-1.5">
              {(card.strengths ?? []).map((s: any) => (
                <div key={s.metricId} className="flex items-baseline justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold text-[#F8FAFC]">{s.label}</span>
                    <span className="font-tech text-[10px] text-[#64748B] ml-1.5">({s.technicalFormula})</span>
                    <div className="text-[11px] text-[#94A3B8] truncate">{s.description}</div>
                  </div>
                  <span className="font-tech text-[11px] font-bold text-[#6EE7B7] shrink-0 tabular">
                    {s.displayValue} · P{s.percentile}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-l-2 border-[#FF6350] pl-3.5 space-y-2">
            <div className="font-tech text-[10px] uppercase tracking-widest text-[#FF6350] font-bold">
              Exploitable Weaknesses &amp; Risks
            </div>
            <div className="space-y-1.5">
              {(card.weaknesses ?? []).map((w: any) => (
                <div key={w.metricId} className="flex items-baseline justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold text-[#F8FAFC]">{w.label}</span>
                    <span className="font-tech text-[10px] text-[#64748B] ml-1.5">({w.technicalFormula})</span>
                    <div className="text-[11px] text-[#94A3B8] truncate">{w.description}</div>
                  </div>
                  <span className="font-tech text-[11px] font-bold text-[#FF6350] shrink-0 tabular">
                    {w.displayValue} · P{w.percentile}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 24-Metric Situation Matrix: Left = STYLE (12), Right = PERFORMANCE (12) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-4 border-b border-[#334155]">
          <div className="space-y-4">
            {renderSectionBlock(TEAM_MATRIX_SECTIONS[0])}
            {renderSectionBlock(TEAM_MATRIX_SECTIONS[1])}
          </div>
          <div className="space-y-4">
            {renderSectionBlock(TEAM_MATRIX_SECTIONS[2])}
            {renderSectionBlock(TEAM_MATRIX_SECTIONS[3])}
          </div>
        </div>

        {/* Key Players Module: Top Threats & Top Creators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#334155]/80 pb-1">
              <span className="font-tech text-[10px] uppercase tracking-widest text-[#6EE7B7] font-bold">
                Key Players · Top Goal Threats
              </span>
              <span className="font-tech text-[10px] text-[#64748B]">non_pen_xg_p90 + shots_p90</span>
            </div>
            <div className="divide-y divide-[#334155]/50 font-tech text-[11px] tabular">
              {(card.topThreats ?? []).map((p: any, idx: number) => (
                <div key={p.playerId} className="py-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 font-data">
                    <span className="font-tech text-[#64748B] mr-1.5">0{idx + 1}</span>
                    <span className="font-semibold text-[#F8FAFC]">{p.playerName}</span>
                    <span className="font-tech text-[10px] text-[#6EE7B7] ml-1.5">{p.position}</span>
                    <span className="font-tech text-[10px] text-[#64748B] ml-1.5">({p.minutesPlayed}m)</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[#6EE7B7] font-bold">{p.primaryStatValue}</span>{" "}
                    <span className="text-[10px] text-[#64748B]">npxG</span> •{" "}
                    <span className="text-[#CBD5E1]">{p.secondaryStatValue}</span>{" "}
                    <span className="text-[10px] text-[#64748B]">Sh</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#334155]/80 pb-1">
              <span className="font-tech text-[10px] uppercase tracking-widest text-[#38BDF8] font-bold">
                Key Players · Top Chance Creators
              </span>
              <span className="font-tech text-[10px] text-[#64748B]">key_passes_p90 + xA_p90</span>
            </div>
            <div className="divide-y divide-[#334155]/50 font-tech text-[11px] tabular">
              {(card.topCreators ?? []).map((p: any, idx: number) => (
                <div key={p.playerId} className="py-1.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 font-data">
                    <span className="font-tech text-[#64748B] mr-1.5">0{idx + 1}</span>
                    <span className="font-semibold text-[#F8FAFC]">{p.playerName}</span>
                    <span className="font-tech text-[10px] text-[#38BDF8] ml-1.5">{p.position}</span>
                    <span className="font-tech text-[10px] text-[#64748B] ml-1.5">({p.minutesPlayed}m)</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[#38BDF8] font-bold">{p.primaryStatValue}</span>{" "}
                    <span className="text-[10px] text-[#64748B]">KP</span> •{" "}
                    <span className="text-[#CBD5E1]">{p.secondaryStatValue}</span>{" "}
                    <span className="text-[10px] text-[#64748B]">xA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {exportMode === "editorial_dark" && (
          <div className="flex items-center justify-between pt-2 border-t border-[#334155]/60 font-tech text-[10px] text-[#64748B]">
            <span>PERCENTILES CALIBRATED VS LEAGUE &lsquo;ALL&rsquo; SITUATION COHORT</span>
            <span className="text-[#94A3B8]">HALFSPACE. • 24-METRIC TACTICAL ENGINE</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 5. CUSTOM PLAYER RANKING LEADERBOARD CARD
// ============================================================================
export function PlayerRankingCard({ card }: { card: any }) {
  const [exportMode, setExportMode] = useState<"editorial_dark" | "transparent_clean">("editorial_dark");
  const cardDomId = `player-ranking-${card.metricKey}-${String(card.season).replace("/", "")}`;
  const rows = card.rows ?? [];
  const maxVal = Math.max(0.01, ...rows.map((r: any) => Math.abs(Number(r.value ?? 0))));

  return (
    <div className="my-4 space-y-2">
      <ExportToolbar
        title="Visual Leaderboard • Custom Metric Ranking"
        exportMode={exportMode}
        setExportMode={setExportMode}
        onDownload={() => void exportElementAsPng(cardDomId, `halfspace-ranking-${card.metricCode}`, exportMode)}
      />

      <div
        id={cardDomId}
        className={`border p-5 space-y-4 ${
          exportMode === "editorial_dark"
            ? "bg-[#0F172A] border-[#334155]"
            : "bg-transparent border-[#334155]/40"
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#334155]">
          <div>
            <h3 className="font-editorial text-xl font-bold text-[#F8FAFC]">{card.title}</h3>
            <p className="font-tech text-[10px] text-[#94A3B8] mt-0.5">{card.subtitle}</p>
          </div>
          <div className="font-tech text-[11px] text-[#6EE7B7]">
            METRIC: <code>{card.metricCode}</code>
          </div>
        </div>

        <div className="divide-y divide-[#334155]/60 border-b border-[#334155]">
          {rows.map((r: any) => {
            const widthPct = Math.min(100, Math.max(6, (Math.abs(Number(r.value)) / maxVal) * 100));
            return (
              <div key={r.playerId} className="py-2 grid grid-cols-12 items-center gap-2 text-xs">
                <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                  <span className="font-tech text-[11px] text-[#64748B] w-5 tabular">
                    {String(r.rank).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#F8FAFC] truncate">
                      {r.playerName}
                      {r.isU23 && (
                        <span className="ml-1.5 font-tech text-[9px] px-1 py-0.2 bg-[#6EE7B7]/15 text-[#6EE7B7] border border-[#6EE7B7]/40">
                          U23
                        </span>
                      )}
                    </div>
                    <div className="font-tech text-[10px] text-[#94A3B8] truncate">
                      {r.teamName} • <span className="text-[#38BDF8]">{r.position}</span> • {r.minutesPlayed}m
                    </div>
                  </div>
                </div>

                <div className="col-span-5">
                  <div className="h-2 w-full bg-[#1E293B] overflow-hidden">
                    <div
                      className={`h-full ${getBarColor(r.percentile)}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2 font-tech tabular">
                  <span className="font-bold text-[#F8FAFC]">{r.value}</span>
                  <span className={`w-8 text-right text-[11px] font-bold ${getPctTextColor(r.percentile)}`}>
                    P{r.percentile}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {exportMode === "editorial_dark" && (
          <div className="flex items-center justify-between font-tech text-[10px] text-[#64748B]">
            <span>{card.leagueName} • SEASON {card.season}</span>
            <span className="text-[#94A3B8]">HALFSPACE. • VISUAL STUDIO</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 6. CLUB X/Y TACTICAL SCATTER MATRIX CARD
// ============================================================================
export function TeamScatterCard({ card }: { card: any }) {
  const [exportMode, setExportMode] = useState<"editorial_dark" | "transparent_clean">("editorial_dark");
  const cardDomId = `team-scatter-${card.xMetricId}-${card.yMetricId}`;
  const teams = card.teams ?? [];

  return (
    <div className="my-4 space-y-2">
      <ExportToolbar
        title="Visual Matrix • Club 2D Tactical Style & Performance"
        exportMode={exportMode}
        setExportMode={setExportMode}
        onDownload={() => void exportElementAsPng(cardDomId, `halfspace-club-matrix`, exportMode)}
      />

      <div
        id={cardDomId}
        className={`border p-5 space-y-4 ${
          exportMode === "editorial_dark"
            ? "bg-[#0F172A] border-[#334155]"
            : "bg-transparent border-[#334155]/40"
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#334155]">
          <div>
            <h3 className="font-editorial text-xl font-bold text-[#F8FAFC]">{card.title}</h3>
            <p className="font-tech text-[10px] text-[#94A3B8] mt-0.5">{card.subtitle}</p>
          </div>
          <div className="font-tech text-[10px] text-[#6EE7B7]">
            AXES: PERCENTILE (P0–P100)
          </div>
        </div>

        {/* 2D Percentile Scatter Canvas */}
        <div className="relative h-80 w-full border border-[#334155] bg-[#0B1120] p-4 overflow-hidden">
          <div
            style={{ left: "50%" }}
            className="absolute top-0 bottom-0 border-l border-dashed border-[#334155] pointer-events-none"
          />
          <div
            style={{ bottom: "50%" }}
            className="absolute left-0 right-0 border-t border-dashed border-[#334155] pointer-events-none"
          />

          <div className="absolute top-2 right-3 font-tech text-[10px] text-[#6EE7B7]">
            HIGH {String(card.xLabel).toUpperCase()} + HIGH {String(card.yLabel).toUpperCase()}
          </div>
          <div className="absolute bottom-2 left-3 font-tech text-[10px] text-[#94A3B8]">
            X: {card.xLabel} <span className="text-[#64748B]">({card.xFormula})</span> &rarr;
          </div>
          <div className="absolute top-2 left-3 font-tech text-[10px] text-[#94A3B8]">
            &uarr; Y: {card.yLabel} <span className="text-[#64748B]">({card.yFormula})</span>
          </div>

          {teams.map((t: any, idx: number) => {
            const xPct = Math.min(91, Math.max(9, Number(t.xPercentile ?? 50) * 0.84 + 8 + ((idx % 3) - 1) * 1.2));
            const yPct = Math.min(89, Math.max(11, Number(t.yPercentile ?? 50) * 0.8 + 10 + ((idx % 2) - 0.5) * 2));

            return (
              <div
                key={t.teamId}
                style={{ left: `${xPct}%`, bottom: `${yPct}%`, zIndex: t.isFocal ? 20 : 10 }}
                className="absolute -translate-x-1/2 translate-y-1/2"
              >
                <div
                  className={`px-2 py-0.5 text-[10px] font-bold border whitespace-nowrap flex items-center gap-1.5 ${
                    t.isFocal
                      ? "bg-[#6EE7B7] text-[#0F172A] border-[#F8FAFC] ring-2 ring-[#6EE7B7]/40"
                      : "bg-[#1E293B]/95 text-[#F8FAFC] border-[#475569]"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: t.isFocal ? "#0F172A" : t.teamColor || "#38BDF8" }}
                  />
                  <span>{t.teamShortName}</span>
                  <span className="font-tech opacity-80">
                    (P{t.xPercentile}, P{t.yPercentile})
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Club Values Table */}
        <div className="overflow-x-auto border-t border-[#334155]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#334155] font-tech text-[10px] uppercase text-[#64748B]">
                <th className="py-2 px-2">Club</th>
                <th className="py-2 px-2 text-right">Matches</th>
                <th className="py-2 px-2 text-right text-[#6EE7B7]">{card.xLabel}</th>
                <th className="py-2 px-2 text-right text-[#38BDF8]">{card.yLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 font-tech text-[11px] tabular">
              {[...teams]
                .sort((a: any, b: any) => b.xPercentile + b.yPercentile - (a.xPercentile + a.yPercentile))
                .slice(0, 12)
                .map((t: any) => (
                  <tr key={t.teamId} className={t.isFocal ? "bg-[#6EE7B7]/10" : "hover:bg-[#1E293B]/40"}>
                    <td className="py-1.5 px-2 font-data font-semibold text-[#F8FAFC]">{t.teamName}</td>
                    <td className="py-1.5 px-2 text-right text-[#CBD5E1]">{t.matches}</td>
                    <td className="py-1.5 px-2 text-right text-[#6EE7B7]">
                      {t.xValue} <span className="text-[#94A3B8]">(P{t.xPercentile})</span>
                    </td>
                    <td className="py-1.5 px-2 text-right text-[#38BDF8]">
                      {t.yValue} <span className="text-[#94A3B8]">(P{t.yPercentile})</span>
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
