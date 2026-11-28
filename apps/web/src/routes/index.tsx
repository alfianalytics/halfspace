import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Calendar, Loader2, Send, SlidersHorizontal } from "lucide-react";
import { newSessionId, setPendingMessage } from "../lib/pending-message";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type FixtureItem = {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  round: number;
  scoreLabel: string;
  leagueName?: string;
};

const SLATE_LEAGUES = [
  { key: "Liga 1", label: "LIGA 1" },
  { key: "Premier League", label: "EPL" },
  { key: "LaLiga", label: "LALIGA" },
  { key: "Serie A", label: "SERIE A" },
  { key: "UEFA Champions League", label: "UCL" },
] as const;

async function loadFixtures(league = "Liga 1"): Promise<FixtureItem[]> {
  try {
    const res = await fetch(`${baseUrl}/api/fixtures?league=${encodeURIComponent(league)}&limit=6`);
    if (!res.ok) return [];
    const data = (await res.json()) as { fixtures: FixtureItem[] };
    return data.fixtures ?? [];
  } catch {
    return [
      { matchId: 1, homeTeam: "Persita Tangerang", awayTeam: "Persib Bandung", round: 11, scoreLabel: "29 Nov • 15:30 WIB" },
      { matchId: 2, homeTeam: "Arema FC", awayTeam: "Persebaya Surabaya", round: 11, scoreLabel: "29 Nov • 15:30 WIB" },
      { matchId: 3, homeTeam: "Bali United FC", awayTeam: "PSM Makassar", round: 12, scoreLabel: "04 Dec • 15:30 WIB" },
    ];
  }
}

export const Route = createFileRoute("/")({
  loader: () => loadFixtures(),
  component: Home,
});

const INSPIRATION_PROMPTS = [
  {
    category: "TEAM STYLE & KEY PLAYERS",
    label: "Bedah gaya main, kekuatan/kelemahan & key players Persib Bandung",
    prompt:
      "Bedah playing style, strengths & weaknesses, formasi dominan, serta key players (top threats & creators) Persib Bandung di Liga 1 musim ini lengkap dengan kartu matriks 24 metriknya.",
  },
  {
    category: "PRE-MATCH & PREDICTED XI",
    label: "Analisis taktik & prediksi Starting XI Persib vs Persija (cek cedera & kuota U-23)",
    prompt:
      "Analisis prematch Persib Bandung vs Persija Jakarta dan prediksi Starting XI kedua tim berdasarkan berita cedera/akumulasi kartu terbaru serta aturan kuota U-23.",
  },
  {
    category: "SCOUTING & PEER QUADRANT",
    label: "Cari gelandang tengah (CM) U-23 lokal Liga 1 dengan progresi & PAdj defense terbaik",
    prompt:
      "Carikan gelandang tengah (CM) U-23 lokal di Liga 1 musim 25/26 yang unggul dalam progresi bola (accurate_long_balls) dan pertahanan PAdj, lalu tampilkan visual peer comparison-nya.",
  },
  {
    category: "MULTI-SEASON & TOP LEAGUES",
    label: "Bandingkan gaya main Arsenal di Premier League atau evolusi 2 musim Marc Klok",
    prompt:
      "Buatkan visual report evolusi dua musim (25/26 vs 26/27) untuk Marc Klok lengkap dengan perubahan persentil dan analisis perannya.",
  },
];

function Home() {
  const initialFixtures = Route.useLoaderData();
  const [slateLeague, setSlateLeague] = useState<string>("Liga 1");
  const [fixtures, setFixtures] = useState<FixtureItem[]>(initialFixtures);
  const [loadingSlate, setLoadingSlate] = useState(false);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (slateLeague === "Liga 1" && initialFixtures.length > 0 && fixtures === initialFixtures) {
      return;
    }
    let cancelled = false;
    setLoadingSlate(true);
    void loadFixtures(slateLeague).then((rows) => {
      if (!cancelled) {
        setFixtures(rows);
        setLoadingSlate(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slateLeague]);

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

  return (
    <div className="flex-1 flex flex-col bg-[#0F172A] overflow-y-auto">
      {/* Top Editorial Sub-Header */}
      <div className="px-6 md:px-8 py-3 border-b border-[#334155] bg-[#0B1120] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-tech text-[11px] uppercase tracking-widest text-[#6EE7B7] font-semibold">
            Football Intelligence &amp; Visual Desk
          </span>
          <span className="text-[#334155]">|</span>
          <span className="font-tech text-[11px] text-[#94A3B8]">
            Liga 1 + Top 5 European Leagues • 23 Seasons
          </span>
        </div>
        <Link
          to="/studio"
          className="inline-flex items-center gap-1.5 font-tech text-[10px] text-[#38BDF8] hover:text-[#6EE7B7] transition-colors"
        >
          <SlidersHorizontal className="w-3 h-3" />
          OPEN INTERACTIVE VISUAL STUDIO &rarr;
        </Link>
      </div>

      {/* Asymmetric Split Layout: Left Open Editorial Desk (7 cols) + Right Matchweek Slate & Studio Card (5 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Open Conversational Brief + Subtle Inspiration Prompts */}
        <div className="lg:col-span-7 p-6 md:p-8 lg:border-r border-[#334155] flex flex-col justify-between gap-8">
          <div className="space-y-6">
            {/* Editorial Masthead */}
            <div className="space-y-2.5">
              <div className="font-tech text-[10px] uppercase tracking-widest text-[#38BDF8]">
                PostgreSQL Match Engine + Hybrid News &amp; Regulation RAG
              </div>
              <h1 className="font-editorial text-3xl md:text-4xl font-bold tracking-tight text-[#F8FAFC] leading-tight">
                Tanyakan apa saja soal taktik tim, scouting pemain, atau persiapan laga.
              </h1>
              <p className="text-sm text-[#94A3B8] max-w-xl leading-relaxed">
                Ketik bebas dengan bahasa sehari-hari—mulai dari bedah gaya main klub, kekuatan &amp; kelemahan lawan, prediksi Starting XI, hingga pencarian pemain lintas 8 liga.
              </p>
            </div>

            {/* Open Free-Form Conversational Composer (No Rigid Tabs) */}
            <form
              onSubmit={handleSubmit}
              className="border border-[#334155] bg-[#0B1120]/90 focus-within:border-[#6EE7B7] transition-colors"
            >
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
                  placeholder="Tulis pertanyaan bebas... misal: 'Gimana gaya main, kekuatan & kelemahan Borneo FC musim ini?', 'Bandingkan Mariano Peralta vs Ciro Alves', atau 'Siapa bek tengah U-23 lokal paling tangguh di Liga 1?'"
                  rows={4}
                  className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none resize-none leading-relaxed"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#334155]/80">
                  <div className="font-tech text-[10px] text-[#64748B]">
                    AUTO-ROUTING: TEAM STYLE (24 METRICS) • SCOUTING • PRE-MATCH XI • SQL + RAG
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="inline-flex items-center gap-2 bg-[#6EE7B7] hover:bg-[#34D399] disabled:opacity-40 text-[#0F172A] px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Mulai Analisis
                  </button>
                </div>
              </div>
            </form>

            {/* Subtle Inspiration Prompts (Not Rigid Feature Tabs) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-tech text-[10px] uppercase tracking-widest text-[#64748B]">
                  Inspirasi Pertanyaan — Klik untuk isi atau langsung jalankan
                </span>
              </div>

              <div className="divide-y divide-[#334155]/70 border-y border-[#334155]/70">
                {INSPIRATION_PROMPTS.map((item) => (
                  <div
                    key={item.category}
                    className="py-2.5 flex items-center justify-between gap-3 group hover:bg-[#1E293B]/35 px-2 -mx-2 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setInput(item.prompt)}
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="font-tech text-[9px] uppercase tracking-wider text-[#38BDF8]">
                        {item.category}
                      </div>
                      <div className="text-xs text-[#CBD5E1] group-hover:text-[#F8FAFC] truncate mt-0.5">
                        {item.label}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => startConversation(item.prompt)}
                      title="Langsung jalankan analisis ini"
                      className="inline-flex items-center gap-1 font-tech text-[10px] text-[#64748B] hover:text-[#6EE7B7] border border-transparent hover:border-[#334155] px-2 py-1 shrink-0 cursor-pointer transition-colors"
                    >
                      Tanya
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Methodology Footnote Strip */}
          <div className="pt-4 border-t border-[#334155] grid grid-cols-3 gap-4 text-[11px]">
            <div>
              <div className="font-tech text-[10px] text-[#6EE7B7] uppercase">24-Metric Team DNA</div>
              <div className="text-[#CBD5E1] mt-0.5">
                In/Out of Possession Style, Attack/Defence &amp; Key Players
              </div>
            </div>
            <div>
              <div className="font-tech text-[10px] text-[#38BDF8] uppercase">Calibrated Player Stats</div>
              <div className="text-[#CBD5E1] mt-0.5">
                True Position (&ge;35% share) &amp; PAdj per 500 opp. touches
              </div>
            </div>
            <div>
              <div className="font-tech text-[10px] text-[#FF6350] uppercase">Verified Context</div>
              <div className="text-[#CBD5E1] mt-0.5">
                RAG berita cedera, 50/50 doubtful, &amp; kuota regulasi Liga 1
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Studio Lab Launchpad + Matchweek Slate */}
        <div className="lg:col-span-5 p-6 md:p-8 bg-[#0B1120]/70 space-y-6">
          {/* Interactive Visual Studio Callout */}
          <div className="border border-[#38BDF8]/40 bg-[#0F172A] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-tech text-[10px] uppercase tracking-widest text-[#38BDF8] font-bold">
                No-Code Visual Template Builder
              </span>
              <span className="font-tech text-[9px] px-1.5 py-0.5 bg-[#38BDF8]/15 text-[#38BDF8]">
                TEAM &amp; PLAYER LEVEL
              </span>
            </div>
            <h2 className="font-editorial text-lg font-bold text-[#F8FAFC]">
              Racik kartu visual &amp; scatter plot sendiri di Visual Studio Lab.
            </h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Pilih liga, musim, level tim/pemain, dan kustomisasi metrik sesuka hati (24 metrik Team Style, X/Y Scatter, Percentile Card, hingga Custom Leaderboard) siap ekspor PNG.
            </p>
            <div className="pt-1">
              <Link
                to="/studio"
                className="inline-flex items-center gap-2 border border-[#38BDF8] bg-[#38BDF8]/10 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#0F172A] px-3.5 py-1.5 font-tech text-[11px] font-bold transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Buka Visual Studio Lab
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Matchweek Slate (Powered by sofascore.fact_upcoming_match) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#6EE7B7]" />
                <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#F8FAFC]">
                  Upcoming Matchweek Slate
                </span>
              </div>

              <div className="inline-flex border border-[#334155] bg-[#0F172A] p-0.5 font-tech text-[9px]">
                {SLATE_LEAGUES.map((lg) => (
                  <button
                    key={lg.key}
                    type="button"
                    onClick={() => setSlateLeague(lg.key)}
                    className={`px-1.5 py-0.5 transition-colors cursor-pointer ${
                      slateLeague === lg.key
                        ? "bg-[#6EE7B7] text-[#0F172A] font-bold"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    {lg.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingSlate ? (
              <div className="py-10 flex items-center justify-center gap-2 font-tech text-xs text-[#38BDF8]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                LOADING UPCOMING MATCHES...
              </div>
            ) : (
              <div className="divide-y divide-[#334155]">
                {fixtures.slice(0, 6).map((f) => (
                  <button
                    key={`${f.matchId}-${f.homeTeam}`}
                    type="button"
                    onClick={() =>
                      startConversation(
                        slateLeague === "Liga 1"
                          ? `Analisis prematch ${f.homeTeam} vs ${f.awayTeam} (Pekan ${f.round}, ${f.scoreLabel}) dan prediksi Starting XI kedua tim berdasarkan gaya main, performa terakhir, berita cedera/akumulasi kartu di RAG, serta aturan kuota U-23.`
                          : `Analisis prematch ${f.homeTeam} vs ${f.awayTeam} di ${slateLeague} (Round ${f.round}, ${f.scoreLabel}) dan prediksi Starting XI serta perbandingan gaya main kedua tim.`,
                      )
                    }
                    className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-[#1E293B]/50 px-2 -mx-2 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#6EE7B7] transition-colors truncate">
                        {f.homeTeam} <span className="text-[#64748B] font-normal">vs</span> {f.awayTeam}
                      </div>
                      <div className="font-tech text-[10px] text-[#94A3B8] mt-0.5 flex items-center gap-2">
                        <span>{slateLeague === "Liga 1" ? `PEKAN ${f.round}` : `ROUND ${f.round}`}</span>
                        <span>•</span>
                        <span className="text-[#38BDF8]">{f.scoreLabel}</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] px-2 py-1 border border-[#334155] group-hover:border-[#6EE7B7] text-[#CBD5E1] group-hover:text-[#6EE7B7] shrink-0 transition-colors">
                      Brief XI
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Multi-League Dossiers */}
          <div className="pt-3 border-t border-[#334155] space-y-2">
            <div className="font-tech text-[10px] uppercase tracking-widest text-[#64748B]">
              Contoh Cepat (Klub &amp; Pemain Lintas Liga)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Persib Style & Key Players", q: "Bedah playing style, strengths, weaknesses, dan key players Persib Bandung musim ini." },
                { label: "Mariano Peralta (Liga 1)", q: "Buatkan visual report scouting untuk Mariano Peralta di Liga 1." },
                { label: "Arsenal Style (EPL)", q: "Bedah playing style, strengths & weaknesses, dan key players Arsenal di Premier League." },
                { label: "Barcelona Style (LaLiga)", q: "Bedah playing style, strengths & weaknesses, dan key players Barcelona di LaLiga." },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => startConversation(item.q)}
                  className="font-tech text-[10px] px-2.5 py-1 border border-[#334155] bg-[#0F172A] hover:border-[#6EE7B7] text-[#CBD5E1] hover:text-[#6EE7B7] transition-colors cursor-pointer"
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
