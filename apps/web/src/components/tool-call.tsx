import { useState } from "react";
import type { UIToolMessagePart } from "@anvia/client";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  Loader2,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import {
  PeerComparisonCard,
  PlayerScoutingCard,
  PrematchLineupCard,
} from "./reports/visual-cards";

function getToolIcon(toolName: string) {
  if (toolName === "scout_players") return <Users className="w-4 h-4 text-emerald-400" />;
  if (toolName === "get_prematch_context") return <ShieldCheck className="w-4 h-4 text-sky-400" />;
  if (toolName === "get_player_report_data") return <Database className="w-4 h-4 text-indigo-400" />;
  if (toolName === "search_liga1_knowledge_rag") return <BookOpen className="w-4 h-4 text-amber-400" />;
  if (toolName === "query_liga1_readonly_sql") return <Database className="w-4 h-4 text-purple-400" />;
  if (toolName === "search_live_football_web") return <Globe className="w-4 h-4 text-sky-400" />;
  return <Wrench className="w-4 h-4 text-emerald-400" />;
}

function getToolLabel(toolName: string) {
  if (toolName === "scout_players") return "PostgreSQL MCP · Player Scouting & Peer Quadrant";
  if (toolName === "get_prematch_context") return "PostgreSQL + RAG MCP · Pre-Match & Predicted XI";
  if (toolName === "get_player_report_data") return "PostgreSQL MCP · Player Scouting & 2-Season Evolution";
  if (toolName === "search_liga1_knowledge_rag") return "Hybrid RAG · Liga 1 News, Injuries & Regulations";
  if (toolName === "query_liga1_readonly_sql") return "PostgreSQL MCP · Guarded Read-Only SQL Query";
  if (toolName === "search_live_football_web") return "External Web MCP · Live Matchday News (Tavily)";
  return toolName;
}

export function ToolCall({ part }: { part: UIToolMessagePart }) {
  const [open, setOpen] = useState(false);

  const isRunning = part.state === "input-streaming" || part.state === "input-available";
  const isError = part.state === "error";
  const isDone = part.state === "output-available";

  const outputObj = isDone && typeof part.output === "object" && part.output !== null ? (part.output as any) : null;
  const visualCard = outputObj?.visualCard;

  return (
    <div className="my-2.5 space-y-2">
      {/* Compact Tool Execution Trace Badge */}
      <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/70 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-zinc-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {getToolIcon(part.toolName)}
            <span className="font-medium text-zinc-200 truncate">{getToolLabel(part.toolName)}</span>
            <code className="text-[11px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded font-mono">
              {part.toolName}
            </code>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Querying Liga 1 DB &amp; RAG…
              </span>
            )}
            {isDone && (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Error
              </span>
            )}
            {open ? (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </button>

        {open && (
          <div className="border-t border-zinc-800/80 px-3.5 py-3 space-y-2.5 bg-zinc-950/60">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                Tool Input Arguments
              </div>
              <pre className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-zinc-300 overflow-x-auto font-mono text-[11px]">
                {typeof part.input === "string" ? part.input : JSON.stringify(part.input, null, 2)}
              </pre>
            </div>

            {isDone && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                  Structured Output (PostgreSQL / RAG)
                </div>
                <pre className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-emerald-300/90 overflow-x-auto max-h-56 font-mono text-[11px]">
                  {JSON.stringify(part.output, null, 2)}
                </pre>
              </div>
            )}

            {part.state === "error" && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold mb-1">
                  Error Details
                </div>
                <pre className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300 overflow-x-auto font-mono text-[11px]">
                  {part.error.message}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline Visual Report Cards Rendered Automatically When Tool Completes */}
      {visualCard?.cardType === "player_scouting" && <PlayerScoutingCard card={visualCard} />}
      {visualCard?.cardType === "prematch_lineup" && <PrematchLineupCard card={visualCard} />}
      {visualCard?.cardType === "peer_comparison" && <PeerComparisonCard card={visualCard} />}
    </div>
  );
}
