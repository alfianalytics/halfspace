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
      ? ((await newsRes.json()) as { lastSyncDate: string }).lastSyncDate || "2026-11-28"
      : "2026-11-28";
    return { sessions, lastSyncDate };
  } catch {
    return { sessions: [], lastSyncDate: "2026-11-28" };
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
      setSyncMsg(`Synced (${data.documentsUpserted ?? 0} live articles)`);
      await router.invalidate();
    } catch {
      setSyncMsg("Using curated local RAG corpus");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0F172A] text-[#F8FAFC] font-data">
      {/* Editorial Left Rail */}
      <aside className="w-68 border-r border-[#334155] bg-[#0B1120] flex flex-col shrink-0">
        {/* Masthead */}
        <div className="px-5 py-4 border-b border-[#334155] flex items-baseline justify-between">
          <Link to="/" className="group flex items-baseline gap-1.5">
            <span className="font-editorial text-xl font-bold tracking-tight text-[#F8FAFC] group-hover:text-[#6EE7B7] transition-colors">
              Halfspace<span className="text-[#6EE7B7]">.</span>
            </span>
            <span className="font-tech text-[10px] uppercase tracking-widest text-[#64748B]">
              Desk
            </span>
          </Link>
          <span className="font-tech text-[10px] text-[#6EE7B7] border border-[#334155] px-1.5 py-0.5 rounded">
            LIGA 1
          </span>
        </div>

        {/* Actions */}
        <div className="p-3.5 space-y-2 border-b border-[#334155]">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 rounded bg-[#6EE7B7] hover:bg-[#34D399] text-[#0F172A] px-3 py-2 text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Analisis / Brief Baru
          </Link>

          <button
            type="button"
            disabled={syncing}
            onClick={() => void handleManualNewsSync()}
            className="w-full flex items-center justify-center gap-2 rounded border border-[#334155] bg-[#0F172A] hover:border-[#6EE7B7]/60 text-[#CBD5E1] px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[#38BDF8] ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing Berita..." : "Sync Berita RAG"}
          </button>

          <div className="flex items-center justify-between px-0.5 pt-0.5 font-tech text-[10px] text-[#64748B]">
            <span>LAST RAG SYNC</span>
            <span className="text-[#6EE7B7] tabular">{lastSyncDate}</span>
          </div>

          {syncMsg && (
            <div className="flex items-center gap-1.5 px-2 py-1 border border-[#6EE7B7]/30 bg-[#6EE7B7]/10 text-[10px] text-[#6EE7B7] rounded">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{syncMsg}</span>
            </div>
          )}
        </div>

        {/* Session History */}
        <div className="px-4 py-2.5 font-tech text-[10px] uppercase tracking-widest text-[#64748B] border-b border-[#334155]/60">
          Arsip Analisis ({sessions.length})
        </div>

        <nav className="flex-1 overflow-y-auto divide-y divide-[#334155]/40">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-xs text-[#64748B] leading-relaxed">
              Belum ada arsip. Pilih pertandingan di Matchweek Slate atau tulis brief baru.
            </div>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                to="/s/$id"
                params={{ id: session.id }}
                activeProps={{
                  className: "bg-[#1E293B]/80 text-[#F8FAFC] border-l-2 border-l-[#6EE7B7]",
                }}
                inactiveProps={{
                  className: "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]/40 border-l-2 border-l-transparent",
                }}
                className="group flex items-center justify-between gap-2 px-4 py-2.5 text-xs transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#38BDF8]" />
                  <div className="truncate font-medium">{session.title}</div>
                </div>
                <button
                  type="button"
                  title="Hapus sesi"
                  onClick={(e) => void handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#FF6350]/20 hover:text-[#FF6350] text-[#64748B] transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Link>
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#334155] font-tech text-[10px] text-[#64748B] flex items-center justify-between">
          <span>POSTGRES + MCP + RAG</span>
          <span className="text-[#38BDF8]">ANVIA v3</span>
        </div>
      </aside>

      {/* Main Content Outlet */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
