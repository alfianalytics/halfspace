import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Calendar, Send } from "lucide-react";
import { newSessionId, setPendingMessage } from "../lib/pending-message";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type FixtureItem = {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  round: number;
  scoreLabel: string;
};

async function loadFixtures(): Promise<FixtureItem[]> {
  try {
    const res = await fetch(`${baseUrl}/api/fixtures`);
    if (!res.ok) return [];
    const data = (await res.json()) as { fixtures: FixtureItem[] };
    return data.fixtures ?? [];
  } catch {
    return [
      { matchId: 1, homeTeam: "Persib Bandung", awayTeam: "Persija Jakarta", round: 12, scoreLabel: "Big Match" },
      { matchId: 2, homeTeam: "Persebaya Surabaya", awayTeam: "Borneo FC", round: 12, scoreLabel: "Big Match" },
      { matchId: 3, homeTeam: "Bali United", awayTeam: "PSM Makassar", round: 12, scoreLabel: "Big Match" },
    ];
  }
}

export const Route = createFileRoute("/")({
  loader: () => loadFixtures(),
  component: Home,
});

type WorkModeKey = "scouting" | "prematch" | "report";

const WORK_MODES: Record<
  WorkModeKey,
  {
    tabLabel: string;
    toolTag: string;
    guardrailNote: string;
    samplePrompt: string;
  }
> = {
  scouting: {
    tabLabel: "01 · Scouting",
    toolTag: "scout_players",
    guardrailNote: "Guardrail: >=450 mins • >=35% true position • PAdj / 500 opp. touches",
    samplePrompt:
      "Carikan gelandang tengah (CM) U-23 lokal di Liga 1 musim 25/26 yang unggul dalam progresi bola (accurate_long_balls) dan pertahanan PAdj, lalu tampilkan visual peer comparison card-nya.",
  },
  prematch: {
    tabLabel: "02 · Pre-Match XI",
    toolTag: "get_prematch_context",
    guardrailNote: "Guardrail: RAG Berita Cedera & 50/50 Doubtful + Kuota U-23 & Asing",
    samplePrompt:
      "Analisis prematch Persib Bandung vs Persija Jakarta minggu ini dan prediksi Starting XI kedua tim berdasarkan berita cedera/akumulasi kartu terbaru beserta visual pitch board-nya.",
  },
  report: {
    tabLabel: "03 · 2-Season Report",
    toolTag: "get_player_report_data",
    guardrailNote: "Guardrail: >=180 mins Early Season Sample (26/27) vs Full Season (25/26)",
    samplePrompt:
      "Buatkan visual report scouting dan perbandingan evolusi dua musim (25/26 vs 26/27) untuk Marc Klok lengkap dengan persentil dan analisis taktiknya.",
  },
};

function Home() {
  const fixtures = Route.useLoaderData();
  const [activeMode, setActiveMode] = useState<WorkModeKey>("scouting");
  const [input, setInput] = useState(WORK_MODES.scouting.samplePrompt);
  const navigate = useNavigate();

  function selectMode(mode: WorkModeKey) {
    setActiveMode(mode);
    setInput(WORK_MODES[mode].samplePrompt);
  }

  function startConversation(text: string) {
    const message = text.trim();
    if (!message) return;
    const id = newSessionId();
    setPendingMessage(id, message);
    void navigate({ to: "/s/$id", params: { id } });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    startConversation(input);
  }

  const currentMode = WORK_MODES[activeMode];

  return (
    <div className="flex-1 flex flex-col bg-[#0F172A] overflow-y-auto">
      {/* Top Editorial Sub-Header */}
      <div className="px-6 md:px-8 py-3 border-b border-[#334155] bg-[#0B1120] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-tech text-[11px] uppercase tracking-widest text-[#6EE7B7] font-semibold">
            Indonesia Super League Intelligence Desk
          </span>
          <span className="text-[#334155]">|</span>
          <span className="font-tech text-[11px] text-[#94A3B8]">
            8 Leagues • 14,184 Aggregated Player Profiles
          </span>
        </div>
        <span className="font-tech text-[10px] text-[#64748B]">
          NO-SQL CONVERSATIONAL WORKSPACE
        </span>
      </div>

      {/* Asymmetric Split Layout: Left Work Desk (7 cols) + Right Matchweek Slate (5 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Masthead + Segmented Work Brief Composer */}
        <div className="lg:col-span-7 p-6 md:p-8 lg:border-r border-[#334155] flex flex-col justify-between gap-6">
          <div className="space-y-6">
            {/* Editorial Masthead */}
            <div className="space-y-2.5">
              <div className="font-tech text-[10px] uppercase tracking-widest text-[#38BDF8]">
                PostgreSQL Analytics + Hybrid News &amp; Regulation RAG
              </div>
              <h1 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-[#F8FAFC] leading-tight">
                Analisis taktik, prediksi Starting XI, dan scouting berbasis data.
              </h1>
              <p className="text-sm text-[#94A3B8] max-w-xl leading-relaxed">
                Pilih mode kerja di bawah atau tulis pertanyaan dalam bahasa sehari-hari. Sistem otomatis menarik data match, berita cedera terbaru, dan merender kartu visual siap ekspor.
              </p>
            </div>

            {/* Segmented Work Mode Composer */}
            <form
              onSubmit={handleSubmit}
              className="border border-[#334155] bg-[#1E293B]/40 rounded-lg overflow-hidden focus-within:border-[#6EE7B7] transition-colors"
            >
              {/* Segmented Tabs */}
              <div className="grid grid-cols-3 border-b border-[#334155] bg-[#0B1120] text-xs font-semibold">
                {(Object.keys(WORK_MODES) as WorkModeKey[]).map((key) => {
                  const isActive = activeMode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectMode(key)}
                      className={`px-3 py-2.5 text-center border-r last:border-r-0 border-[#334155] transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#0F172A] text-[#6EE7B7] border-b-2 border-b-[#6EE7B7]"
                          : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]/50"
                      }`}
                    >
                      {WORK_MODES[key].tabLabel}
                    </button>
                  );
                })}
              </div>

              {/* Textarea */}
              <div className="p-4 space-y-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      startConversation(input);
                    }
                  }}
                  placeholder="Tulis brief scouting, prematch, atau nama pemain..."
                  rows={4}
                  className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none resize-none leading-relaxed"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#334155]/80">
                  <div className="font-tech text-[10px] text-[#94A3B8]">
                    <span className="text-[#38BDF8] mr-1.5">[{currentMode.toolTag}]</span>
                    {currentMode.guardrailNote}
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="inline-flex items-center gap-2 rounded bg-[#6EE7B7] hover:bg-[#34D399] disabled:opacity-40 text-[#0F172A] px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Jalankan Analisis
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Methodology & Palette Legend Strip */}
          <div className="pt-4 border-t border-[#334155] grid grid-cols-3 gap-4 text-[11px]">
            <div>
              <div className="font-tech text-[10px] text-[#6EE7B7] uppercase">Progression Proxy</div>
              <div className="text-[#CBD5E1] mt-0.5">
                <code className="font-tech text-[10px]">accurate_long_balls</code> &amp;{" "}
                <code className="font-tech text-[10px]">acc_opp_half_passes</code>
              </div>
            </div>
            <div>
              <div className="font-tech text-[10px] text-[#38BDF8] uppercase">Calibrated Defense</div>
              <div className="text-[#CBD5E1] mt-0.5">
                PAdj per 500 opponent touches (<code className="font-tech text-[10px]">padj500</code>)
              </div>
            </div>
            <div>
              <div className="font-tech text-[10px] text-[#FF6350] uppercase">Lineup Integrity</div>
              <div className="text-[#CBD5E1] mt-0.5">
                Cek cedera, 50/50 doubtful, &amp; kuota U-23 / Asing
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Matchweek Slate (1px Scoreboard Rail) */}
        <div className="lg:col-span-5 p-6 md:p-8 bg-[#0B1120]/70 space-y-5">
          <div className="flex items-center justify-between border-b border-[#334155] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#6EE7B7]" />
              <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#F8FAFC]">
                Matchweek Slate · Liga 1
              </span>
            </div>
            <span className="font-tech text-[10px] text-[#6EE7B7] border border-[#334155] px-2 py-0.5 rounded">
              1-CLICK PRE-MATCH
            </span>
          </div>

          <div className="divide-y divide-[#334155]">
            {fixtures.slice(0, 6).map((f) => (
              <button
                key={`${f.matchId}-${f.homeTeam}`}
                type="button"
                onClick={() =>
                  startConversation(
                    `Analisis prematch ${f.homeTeam} vs ${f.awayTeam} dan prediksi Starting XI kedua tim berdasarkan performa terakhir, berita cedera/akumulasi kartu di RAG, serta aturan kuota U-23.`,
                  )
                }
                className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#1E293B]/50 px-2 -mx-2 rounded transition-colors cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#6EE7B7] transition-colors truncate">
                    {f.homeTeam} <span className="text-[#64748B] font-normal">vs</span> {f.awayTeam}
                  </div>
                  <div className="font-tech text-[10px] text-[#94A3B8] mt-1 flex items-center gap-2">
                    <span>PEKAN {f.round}</span>
                    <span>•</span>
                    <span className="text-[#38BDF8]">{f.scoreLabel}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 font-tech text-[11px] px-2.5 py-1 border border-[#334155] group-hover:border-[#6EE7B7] text-[#CBD5E1] group-hover:text-[#6EE7B7] rounded shrink-0 transition-colors">
                  Prediksi XI
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>

          {/* Quick Player Spotlight Links */}
          <div className="pt-4 border-t border-[#334155] space-y-2.5">
            <div className="font-tech text-[10px] uppercase tracking-widest text-[#64748B]">
              Quick Player Dossiers (Top Leagues &amp; Liga 1)
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Mariano Peralta (Liga 1)", q: "Buatkan visual report scouting untuk Mariano Peralta di Liga 1." },
                { label: "Marc Klok (2-Season)", q: "Buatkan visual report evolusi dua musim (25/26 vs 26/27) untuk Marc Klok." },
                { label: "Rizky Ridho (PAdj)", q: "Tampilkan visual report scouting dan metrik bertahan PAdj untuk Rizky Ridho." },
                { label: "Bukayo Saka (EPL)", q: "Buatkan visual report scouting untuk Bukayo Saka di Premier League." },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => startConversation(item.q)}
                  className="font-tech text-[11px] px-2.5 py-1 border border-[#334155] bg-[#0F172A] hover:border-[#38BDF8] text-[#CBD5E1] hover:text-[#38BDF8] rounded transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
