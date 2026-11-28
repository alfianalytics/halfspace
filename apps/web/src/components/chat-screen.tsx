import { useEffect, useMemo, useState } from "react";
import { createHttpClientTransport, type UIMessage } from "@anvia/client";
import { useChat } from "@anvia/react";
import {
  ChatProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@anvia/react-ui";
import { rootRouteId, useRouter } from "@tanstack/react-router";
import { Activity, ChevronDown, Send, Square } from "lucide-react";
import { takePendingMessage } from "../lib/pending-message";
import { ToolCall } from "./tool-call";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ChatScreenProps = {
  sessionId: string;
  initialMessages?: UIMessage[];
};

type TraceItem = {
  traceId: string;
  sessionId: string;
  timestamp: string;
  durationMs: number;
  workflowSteps: string[];
  mcpToolsCalled: string[];
  ragDocsCited: string[];
  modelId: string;
};

export function ChatScreen({ sessionId, initialMessages = [] }: ChatScreenProps) {
  const router = useRouter();
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [showTraceDrawer, setShowTraceDrawer] = useState(false);

  async function fetchSessionTraces() {
    try {
      const res = await fetch(`${baseUrl}/api/traces?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setTraces(data.traces ?? []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void fetchSessionTraces();
  }, [sessionId]);

  const transport = useMemo(
    () =>
      createHttpClientTransport({
        endpoint: baseUrl + "/api/chat",
        body: ({ request, headers }) => {
          if (!headers.has("content-type")) {
            headers.set("content-type", "application/json");
          }
          return JSON.stringify({
            ...request,
            metadata: { ...request.metadata, sessionId },
          });
        },
      }),
    [sessionId],
  );

  const chat = useChat({
    transport,
    initialMessages,
    onEvent: (event) => {
      if (event.type === "run_end") {
        void router.invalidate({
          filter: (match) => match.routeId === rootRouteId,
        });
        void fetchSessionTraces();
      }
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const text = takePendingMessage(sessionId);
      if (text) {
        void chat.sendMessage({ text });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [sessionId, chat]);

  const streaming = chat.status === "submitted" || chat.status === "streaming";
  const latestTrace = traces[0];

  return (
    <ChatProvider controller={chat}>
      <ThreadPrimitive.Root className="flex flex-col h-full w-full bg-[#0F172A]">
        {/* Editorial Top Session Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#334155] bg-[#0B1120] shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#6EE7B7]" />
            <span className="font-editorial text-base font-bold text-[#F8FAFC]">
              Halfspace Brief
            </span>
            <span className="text-[#334155]">|</span>
            <span className="font-tech text-[11px] text-[#94A3B8]">{sessionId}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTraceDrawer((p) => !p)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#334155] bg-[#0F172A] hover:border-[#6EE7B7]/60 text-[#CBD5E1] font-tech text-[11px] transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#6EE7B7]" />
              <span>
                Trace ({traces.length}
                {latestTrace ? ` • ${latestTrace.modelId}` : ""})
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="font-tech text-[11px] text-[#64748B] uppercase">
              {chat.status}
            </div>
          </div>
        </header>

        {/* Collapsible Observability Trace Drawer */}
        {showTraceDrawer && (
          <div className="border-b border-[#334155] bg-[#0B1120] px-6 py-3 text-xs space-y-2 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between font-tech text-[10px] text-[#94A3B8]">
              <span className="text-[#F8FAFC] font-bold uppercase tracking-wider">
                Anvia Lens &amp; In-App Workflow Trace
              </span>
              <span>SERVICE: halfspace-liga1-agent</span>
            </div>
            {traces.length === 0 ? (
              <div className="text-[#64748B] py-1 font-tech text-[11px]">No runs recorded yet.</div>
            ) : (
              <div className="divide-y divide-[#334155] border-y border-[#334155]">
                {traces.map((t) => (
                  <div key={t.traceId} className="py-2 flex flex-wrap items-center justify-between gap-2 font-tech text-[11px]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[#6EE7B7] font-bold">{t.traceId}</span>
                      <span className="text-[#64748B]">{new Date(t.timestamp).toLocaleTimeString()}</span>
                      <span className="text-[#38BDF8]">{t.modelId}</span>
                    </div>
                    <div className="text-[#94A3B8] truncate">
                      Tools: <span className="text-[#F8FAFC]">{t.mcpToolsCalled.join(", ")}</span> • RAG:{" "}
                      <span className="text-[#6EE7B7]">{t.ragDocsCited.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message Viewport */}
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <ThreadPrimitive.Empty className="py-16 text-center space-y-2 border-y border-[#334155]">
              <div className="font-tech text-[10px] uppercase tracking-widest text-[#6EE7B7]">
                Ready for Brief
              </div>
              <h2 className="font-editorial text-xl font-bold text-[#F8FAFC]">
                Tanyakan Scouting, Pre-Match Lineup, atau Visual Report
              </h2>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                Data ditarik langsung dari PostgreSQL (8 Liga / 23 Musim) dan Hybrid News &amp; Regulation RAG.
              </p>
            </ThreadPrimitive.Empty>

            <ThreadPrimitive.Messages className="space-y-6">
              {(message) =>
                message.role === "user" ? (
                  <MessagePrimitive.Root key={message.id} className="flex justify-end">
                    <div className="max-w-[82%] border-l-2 border-[#6EE7B7] bg-[#1E293B]/70 px-4 py-3 rounded-r text-sm text-[#F8FAFC] leading-relaxed">
                      <div className="font-tech text-[10px] uppercase tracking-wider text-[#6EE7B7] mb-1">
                        Analyst Brief
                      </div>
                      <MessagePrimitive.Parts />
                    </div>
                  </MessagePrimitive.Root>
                ) : (
                  <MessagePrimitive.Root key={message.id} className="border-t border-[#334155]/70 pt-5">
                    <div className="space-y-2 text-sm text-[#E2E8F0] leading-relaxed">
                      <div className="font-tech text-[10px] uppercase tracking-widest text-[#38BDF8]">
                        Halfspace Intelligence Report
                      </div>
                      <MessagePrimitive.Parts>
                        {(part) => {
                          if (part.type === "tool") {
                            return <ToolCall part={part} />;
                          }
                          if (part.type === "text") {
                            return (
                              <MessagePrimitive.Markdown className="prose prose-invert max-w-none space-y-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-[#38BDF8] [&_a]:underline [&_code]:font-tech [&_code]:bg-[#1E293B] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-[#6EE7B7] [&_pre]:bg-[#0B1120] [&_pre]:border [&_pre]:border-[#334155] [&_pre]:p-3.5 [&_pre]:rounded [&_pre]:overflow-x-auto [&_h1]:font-editorial [&_h1]:text-xl [&_h1]:font-bold [&_h2]:font-editorial [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold [&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:border-[#334155] [&_th]:py-1.5 [&_th]:text-left [&_th]:font-tech [&_th]:text-xs [&_td]:border-b [&_td]:border-[#334155]/50 [&_td]:py-1.5 [&_td]:text-xs">
                                {part.text}
                              </MessagePrimitive.Markdown>
                            );
                          }
                          return <MessagePrimitive.Part />;
                        }}
                      </MessagePrimitive.Parts>
                    </div>
                  </MessagePrimitive.Root>
                )
              }
            </ThreadPrimitive.Messages>

            <ThreadPrimitive.Error className="border border-[#FF6350]/50 bg-[#FF6350]/10 px-4 py-3 text-xs text-[#FF6350] rounded" />
          </div>
        </ThreadPrimitive.Viewport>

        {/* Bottom Composer */}
        <div className="px-6 py-4 border-t border-[#334155] bg-[#0B1120]">
          <div className="max-w-4xl mx-auto">
            <ComposerPrimitive.Root className="flex items-end gap-3 border border-[#334155] bg-[#0F172A] px-4 py-2.5 rounded focus-within:border-[#6EE7B7] transition-colors">
              <ComposerPrimitive.TextareaInput
                placeholder="Lanjutkan analisis (misal: 'Bandingkan dengan gelandang Persija', atau 'Export visual card-nya')..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none resize-none max-h-36 leading-relaxed"
              />
              {streaming ? (
                <ComposerPrimitive.Stop className="inline-flex items-center gap-1.5 rounded bg-[#FF6350] hover:bg-[#F87171] text-[#0F172A] px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0">
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop
                </ComposerPrimitive.Stop>
              ) : (
                <ComposerPrimitive.Submit className="inline-flex items-center gap-1.5 rounded bg-[#6EE7B7] hover:bg-[#34D399] disabled:opacity-40 text-[#0F172A] px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0">
                  <Send className="w-3.5 h-3.5" />
                  Kirim
                </ComposerPrimitive.Submit>
              )}
            </ComposerPrimitive.Root>
          </div>
        </div>
      </ThreadPrimitive.Root>
    </ChatProvider>
  );
}
