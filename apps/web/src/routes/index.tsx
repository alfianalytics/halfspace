import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Calendar,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
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

const USE_CASE_CARDS = [
  {
    icon: Users,
    title: "1. Player Scouting & Peer Quadrant",
    badge: "scout_players",
    description: "Cari pemain U-23 lokal atau asing berdasarkan progresi bola & PAdj defense lengkap dengan grafik 2D Quadrant.",
    prompt:
      "Carikan gelandang tengah (CM) U-23 lokal di Liga 1 musim 25/26 yang bagus dalam progresi bola dan bertahan (PAdj), lalu tampilkan visual peer comparison card-nya.",
  },
  {
    icon: ShieldCheck,
    title: "2. Pre-Match & Prediksi Starting XI",
    badge: "get_prematch_context",
    description: "Gabungkan statistik performa terakhir dengan RAG berita cedera, pemain 50/50 doubtful (+ backup), & aturan kuota U-23.",
    prompt:
      "Analisis prematch Persib Bandung vs Persija Jakarta minggu ini dan prediksi Starting XI kedua tim berdasarkan berita cedera/akumulasi kartu terbaru beserta visual pitch board-nya.",
  },
  {
    icon: BarChart3,
    title: "3. Visual Report & 2-Season Evolution",
    badge: "get_player_report_data",
    description: "Generate kartu profil persentil pemain atau perbandingan evolusi 2 musim (25/26 vs 26/27) yang siap di-export ke PNG.",
    prompt:
      "Buatkan visual report scouting dan perbandingan evolusi dua musim (25/26 vs 26/27) untuk Marc Klok lengkap dengan persentil dan analisis taktiknya.",
  },
];

function Home() {
  const fixtures = Route.useLoaderData();
  const [input, setInput] = useState("");
  const navigate = useNavigate();

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
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-zinc-950 overflow-y-auto">
      <div className="w-full max-w-4xl space-y-7">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Indonesia Super League (Liga 1) Intelligence · Tanpa Perlu SQL
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Scouting, Prediksi Starting XI &amp; Visual Report Liga 1
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Dirancang untuk jurnalis olahraga, kreator konten, komentator, dan staf klub. Tanyakan dalam bahasa sehari-hari—Halfspace otomatis mengecek database PostgreSQL pertandingan, RAG berita cedera terbaru, serta regulasi kuota U-23 &amp; pemain asing.
          </p>
        </div>

        {/* Live Jadwal & Big Match Liga 1 Bar (1-Click Pre-Match Trigger) */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Jadwal &amp; Big Match Liga 1 (Klik untuk Analisis Pre-Match &amp; Prediksi Lineup Instan)</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">PostgreSQL Live Fixtures</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {fixtures.slice(0, 6).map((f) => (
              <button
                key={`${f.matchId}-${f.homeTeam}`}
                type="button"
                onClick={() =>
                  startConversation(
                    `Analisis prematch ${f.homeTeam} vs ${f.awayTeam} dan prediksi Starting XI kedua tim berdasarkan performa terakhir, berita cedera/akumulasi kartu di RAG, serta aturan kuota U-23.`,
                  )
                }
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800/80 hover:border-emerald-500/40 px-3 py-2 text-left transition-all cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-300 truncate">
                    {f.homeTeam} vs {f.awayTeam}
                  </div>
                  <div className="text-[10px] text-zinc-500">Pekan {f.round} • Klik untuk Prediksi XI</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] shrink-0">
                  {f.scoreLabel}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3.5 shadow-xl focus-within:border-emerald-500/60 transition-colors"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                startConversation(input);
              }
            }}
            placeholder="Ketik pertanyaan analisis Liga 1 kamu di sini… (Tekan Enter untuk mulai)"
            rows={3}
            className="w-full bg-transparent px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/80">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 px-1">
              <span>MCP Tools: Player Scouting · Pre-Match Lineup · 2-Season Visual Report · News &amp; Rules RAG</span>
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Mulai Analisis
            </button>
          </div>
        </form>

        {/* 3 Core Use Case Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {USE_CASE_CARDS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => startConversation(item.prompt)}
                className="flex flex-col justify-between text-left p-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/40 transition-all group cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Icon className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300">
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                    {item.title}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{item.description}</p>
                  <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-300 italic line-clamp-2">
                    "{item.prompt}"
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
