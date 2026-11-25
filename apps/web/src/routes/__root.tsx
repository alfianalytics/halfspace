import { useState } from "react";
import {
  Link,
  Outlet,
  createRootRoute,
  useRouter,
} from "@tanstack/react-router";
import {
  CheckCircle2,
  MessageSquare,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";
import "../styles.css";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type SessionItem = {
  id: string;
  title: string;
  updatedAt: string;
};

async function loadRootData(): Promise<{ sessions: SessionItem[]; lastSyncDate: string }> {
  try {
    const [sessRes, newsRes] = await Promise.all([
      fetch(`${baseUrl}/api/session`),
      fetch(`${baseUrl}/api/news/status`),
    ]);
    const sessions = sessRes.ok ? ((await sessRes.json()) as { sessions: SessionItem[] }).sessions ?? [] : [];
    const lastSyncDate = newsRes.ok
      ? ((await newsRes.json()) as { lastSyncDate: string }).lastSyncDate || "2026-11-25"
      : "2026-11-25";
    return { sessions, lastSyncDate };
  } catch {
    return { sessions: [], lastSyncDate: "2026-11-25" };
  }
}

export const Route = createRootRoute({
  loader: () => loadRootData(),
  component: RootLayout,
});

function RootLayout() {
  const { sessions, lastSyncDate } = Route.useLoaderData();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`${baseUrl}/api/session/${id}`, { method: "DELETE" });
      await router.invalidate();
    } catch {
      // ignore
    }
  }

  async function handleManualNewsSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`${baseUrl}/api/news/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSyncMsg(`Synced (${data.documentsUpserted ?? 0} live articles added to RAG)`);
      await router.invalidate();
    } catch {
      setSyncMsg("Using curated local RAG corpus");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-800/80 bg-zinc-900/50 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                Halfspace
              </div>
              <div className="text-[11px] text-zinc-500">
                Liga 1 Intelligence &amp; Visual Reports
              </div>
            </div>
          </Link>
        </div>

        {/* New Chat + Hybrid News Sync Buttons */}
        <div className="p-3 space-y-2 border-b border-zinc-800/60">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Analisis / Report Baru
          </Link>

          <button
            type="button"
            disabled={syncing}
            onClick={() => void handleManualNewsSync()}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 text-zinc-200 px-3 py-2 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing Berita Liga 1…" : "Sync Berita Terbaru (RAG)"}
          </button>

          <div className="flex items-center justify-between px-1 text-[10px] text-zinc-500">
            <span>Last News RAG Sync:</span>
            <span className="font-mono text-emerald-400">{lastSyncDate}</span>
          </div>
          {syncMsg && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{syncMsg}</span>
            </div>
          )}
        </div>

        {/* Session History List */}
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Riwayat Analisis ({sessions.length})
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {sessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-zinc-500">
              Belum ada riwayat analisis. Pilih salah satu pertandingan atau template di kanan!
            </div>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                to="/s/$id"
                params={{ id: session.id }}
                activeProps={{
                  className: "bg-zinc-800/90 text-white border-zinc-700/80 shadow-xs",
                }}
                inactiveProps={{
                  className: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-transparent",
                }}
                className="group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-emerald-400/80" />
                  <div className="truncate font-medium">{session.title}</div>
                </div>
                <button
                  type="button"
                  title="Hapus sesi"
                  onClick={(e) => void handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-500/20 hover:text-rose-400 text-zinc-500 transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Link>
            ))
          )}
        </nav>

        {/* Footer Info */}
        <div className="p-3.5 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>PostgreSQL + MCP + RAG</span>
          <span className="text-emerald-400 font-mono">Anvia v3</span>
        </div>
      </aside>

      {/* Main Content Outlet */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
