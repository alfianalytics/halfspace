import { useState } from "react";
import { Download } from "lucide-react";

/**
 * Pure SVG / Canvas PNG Exporter for Halfspace Editorial Visual Cards
 * Supports Dual Export Modes: `editorial_dark` (#0F172A) and `transparent_clean`.
 */
async function exportElementAsPng(elementId: string, filename: string, mode: "editorial_dark" | "transparent_clean") {
  const el = document.getElementById(elementId);
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const width = Math.max(760, Math.round(rect.width));
  const height = Math.max(460, Math.round(rect.height));

  const clone = el.cloneNode(true) as HTMLElement;
  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.background = mode === "transparent_clean" ? "transparent" : "#0F172A";

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
  if (pct >= 80) return "bg-[#6EE7B7]"; // Hero Mint
  if (pct >= 55) return "bg-[#38BDF8]"; // Sky Blue
  return "bg-[#FF6350]"; // Warm Coral
}

function getPctTextColor(pct: number): string {
  if (pct >= 80) return "text-[#6EE7B7]";
  if (pct >= 55) return "text-[#38BDF8]";
  return "text-[#FF6350]";
}

function ExportToolbar({
  title,
  exportMode,
  setExportMode,
  onDownload,
}: {
  title: string;
  exportMode: "editorial_dark" | "transparent_clean";
  setExportMode: (m: "editorial_dark" | "transparent_clean") => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs">
      <span className="font-tech text-[10px] uppercase tracking-widest text-[#38BDF8]">{title}</span>
      <div className="flex items-center gap-2">
        <div className="inline-flex border border-[#334155] bg-[#0B1120] rounded p-0.5 font-tech text-[10px]">
          <button
            type="button"
            onClick={() => setExportMode("editorial_dark")}
            className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
              exportMode === "editorial_dark" ? "bg-[#1E293B] text-[#F8FAFC]" : "text-[#64748B] hover:text-[#CBD5E1]"
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
                {card.isLocal ? "IDN LOCAL" : `${card.nationality} FOREIGN`}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              {card.teamName} • Season <span className="text-[#F8FAFC] font-semibold">{card.season}</span>
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
                    <span className="text-xs font-bold text-[#F8FAFC]">{m.valuePer90}</span>
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
// 3. PEER COMPARISON CARD (2D Scatter Quadrant + Dense Tabular Cohort)
// ============================================================================
export function PeerComparisonCard({ card }: { card: any }) {
  const [exportMode, setExportMode] = useState<"editorial_dark" | "transparent_clean">("editorial_dark");
  const cardDomId = `peer-comparison-${card.season?.replace("/", "") || "liga1"}`;
  const players = card.players ?? [];

  const maxX = Math.max(1, ...players.map((p: any) => Number(p.xValue ?? 0))) * 1.15;
  const maxY = Math.max(1, ...players.map((p: any) => Number(p.yValue ?? 0))) * 1.15;

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
            <span className="text-[#38BDF8]">● LOCAL (IDN)</span>
            <span className="text-[#FF6350]">□ FOREIGN (DASHED)</span>
          </div>
        </div>

        {/* 2D Quadrant Canvas */}
        <div className="relative h-72 w-full border border-[#334155] bg-[#0B1120] p-4 overflow-hidden">
          <div
            style={{ left: `${Math.min(85, Math.max(15, (card.xMedian / maxX) * 100))}%` }}
            className="absolute top-0 bottom-0 border-l border-dashed border-[#334155] pointer-events-none"
          />
          <div
            style={{ bottom: `${Math.min(85, Math.max(15, (card.yMedian / maxY) * 100))}%` }}
            className="absolute left-0 right-0 border-t border-dashed border-[#334155] pointer-events-none"
          />

          <div className="absolute top-2 right-3 font-tech text-[10px] text-[#6EE7B7]">
            ELITE TWO-WAY (PROGRESSION + PADJ DEF)
          </div>
          <div className="absolute bottom-2 left-3 font-tech text-[10px] text-[#64748B]">
            X: {card.xAxisLabel} ({card.xAxisCode}) &rarr;
          </div>
          <div className="absolute top-2 left-3 font-tech text-[10px] text-[#64748B]">
            &uarr; Y: {card.yAxisLabel}
          </div>

          {players.map((p: any, idx: number) => {
            const xPct = Math.min(88, Math.max(10, (Number(p.xValue) / maxX) * 86 + (idx % 3) * 2));
            const yPct = Math.min(86, Math.max(14, (Number(p.yValue) / maxY) * 82 + (idx % 2) * 3));

            return (
              <div
                key={p.playerId}
                style={{ left: `${xPct}%`, bottom: `${yPct}%` }}
                className="absolute -translate-x-1/2 translate-y-1/2"
              >
                <div
                  className={`px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                    p.isLocal ? "rounded-full border" : "rounded-none border border-dashed"
                  } ${
                    p.isU23
                      ? "bg-[#6EE7B7] text-[#0F172A] border-[#A7F3D0]"
                      : p.isFocal
                        ? "bg-[#38BDF8] text-[#0F172A] border-[#F8FAFC]"
                        : "bg-[#1E293B] text-[#F8FAFC] border-[#475569]"
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
                <th className="py-2 px-2 text-right">accurate_long_balls</th>
                <th className="py-2 px-2 text-right">key_passes_p90</th>
                <th className="py-2 px-2 text-right">padj500_def</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 font-tech text-[11px] tabular">
              {players.slice(0, 8).map((p: any) => (
                <tr key={p.playerId} className="hover:bg-[#1E293B]/40">
                  <td className="py-1.5 px-2 font-data font-semibold text-[#F8FAFC]">{p.playerName}</td>
                  <td className="py-1.5 px-2 font-data text-[#94A3B8]">{p.teamName}</td>
                  <td className="py-1.5 px-2 text-[#CBD5E1]">
                    <span className="text-[#6EE7B7]">{p.position}</span> • {p.age}y ({p.nationality})
                  </td>
                  <td className="py-1.5 px-2 text-right text-[#CBD5E1]">{p.minutesPlayed}</td>
                  <td className="py-1.5 px-2 text-right text-[#6EE7B7]">
                    {p.metrics?.["Acc. Long Balls / 90"] ?? p.xValue}
                  </td>
                  <td className="py-1.5 px-2 text-right text-[#38BDF8]">{p.metrics?.["Key Passes / 90"] ?? 0}</td>
                  <td className="py-1.5 px-2 text-right text-[#F8FAFC]">
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
