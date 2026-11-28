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
  if (toolName === "scout_players") return <Users className="w-3.5 h-3.5 text-[#6EE7B7]" />;
  if (toolName === "get_prematch_context") return <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />;
  if (toolName === "get_player_report_data") return <Database className="w-3.5 h-3.5 text-[#6EE7B7]" />;
  if (toolName === "search_liga1_knowledge_rag") return <BookOpen className="w-3.5 h-3.5 text-[#38BDF8]" />;
  if (toolName === "query_liga1_readonly_sql") return <Database className="w-3.5 h-3.5 text-[#94A3B8]" />;
  if (toolName === "search_live_football_web") return <Globe className="w-3.5 h-3.5 text-[#38BDF8]" />;
  return <Wrench className="w-3.5 h-3.5 text-[#6EE7B7]" />;
}

function getToolLabel(toolName: string) {
  if (toolName === "scout_players") return "PostgreSQL MCP · Player Scouting & Peer Quadrant";
  if (toolName === "get_prematch_context") return "PostgreSQL + RAG MCP · Pre-Match & Predicted XI";
  if (toolName === "get_player_report_data") return "PostgreSQL MCP · Player Scouting & 2-Season Evolution";
  if (toolName === "search_liga1_knowledge_rag") return "Hybrid RAG · News, Injuries & Regulations";
  if (toolName === "query_liga1_readonly_sql") return "PostgreSQL MCP · Read-Only SQL Query";
  if (toolName === "search_live_football_web") return "Web Search MCP · Live Matchday News";
  if (toolName === "remember_user_fact") return "Cross-Session Memory · User Fact Saved";
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
      {/* Hairline Tool Execution Strip */}
      <div className="border-y border-[#334155] bg-[#0B1120]/60 text-xs">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 px-2 py-2 text-left hover:bg-[#1E293B]/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {getToolIcon(part.toolName)}
            <span className="font-medium text-[#E2E8F0] truncate">{getToolLabel(part.toolName)}</span>
            <code className="font-tech text-[10px] text-[#64748B]">{part.toolName}</code>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-tech text-[11px]">
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 text-[#38BDF8]">
                <Loader2 className="w-3 h-3 animate-spin" />
                QUERYING...
              </span>
            )}
            {isDone && (
              <span className="inline-flex items-center gap-1 text-[#6EE7B7]">
                <CheckCircle2 className="w-3 h-3" />
                VERIFIED
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1 text-[#FF6350]">
                <AlertCircle className="w-3 h-3" />
                ERROR
              </span>
            )}
            {open ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
            )}
          </div>
        </button>

        {open && (
          <div className="border-t border-[#334155] px-2 py-2.5 space-y-2 bg-[#0B1120]">
            <div>
              <div className="font-tech text-[10px] uppercase tracking-wider text-[#64748B] mb-1">
                Input Arguments
              </div>
              <pre className="p-2 border border-[#334155] bg-[#0F172A] text-[#CBD5E1] overflow-x-auto font-tech text-[11px]">
                {typeof part.input === "string" ? part.input : JSON.stringify(part.input, null, 2)}
              </pre>
            </div>

            {isDone && (
              <div>
                <div className="font-tech text-[10px] uppercase tracking-wider text-[#64748B] mb-1">
                  Output Payload
                </div>
                <pre className="p-2 border border-[#334155] bg-[#0F172A] text-[#6EE7B7] overflow-x-auto max-h-52 font-tech text-[11px]">
                  {JSON.stringify(part.output, null, 2)}
                </pre>
              </div>
            )}

            {part.state === "error" && (
              <div>
                <div className="font-tech text-[10px] uppercase tracking-wider text-[#FF6350] mb-1">
                  Error Details
                </div>
                <pre className="p-2 border border-[#FF6350]/40 bg-[#FF6350]/10 text-[#FF6350] overflow-x-auto font-tech text-[11px]">
                  {part.error.message}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline Editorial Visual Cards */}
      {visualCard?.cardType === "player_scouting" && <PlayerScoutingCard card={visualCard} />}
      {visualCard?.cardType === "prematch_lineup" && <PrematchLineupCard card={visualCard} />}
      {visualCard?.cardType === "peer_comparison" && <PeerComparisonCard card={visualCard} />}
    </div>
  );
}
